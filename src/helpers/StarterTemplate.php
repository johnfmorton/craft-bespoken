<?php

namespace johnfmorton\bespoken\helpers;

use craft\base\FieldInterface;
use craft\fields\Matrix;
use craft\fields\PlainText;
use craft\models\EntryType;
use craft\models\FieldLayout;
use johnfmorton\bespoken\fields\BespokenField;

/**
 * Builds a starter narration script definition for an entry type, as a Twig
 * script template or as a field-handle list.
 *
 * The template lists the entry's text fields one per line (each line becomes a
 * paragraph when the script is cleaned) and loops over every Matrix field,
 * nested as deep as the content model goes, branching on block type when a
 * Matrix field has more than one. Fields Bespoken can't narrate are named in a
 * comment so the author knows what was left out. It's a starting point to edit,
 * not a finished script.
 */
final class StarterTemplate
{
    /** Nesting levels of Matrix fields to descend into before giving up. */
    private const MAX_DEPTH = 10;

    private const INDENT = '  ';

    /** Loop variable names that would shadow something the template relies on. */
    private const RESERVED_VARIABLES = ['entry', 'object', 'element', 'loop', 'craft', 'now'];

    /** Field types whose values are text Bespoken can narrate directly. */
    private const TEXT_FIELD_CLASSES = [
        PlainText::class,
        'craft\\ckeditor\\Field',
        'craft\\redactor\\Field',
    ];

    public static function forEntryType(EntryType $entryType): string
    {
        $lines = ['{{ entry.title }}'];
        self::appendLayout($lines, $entryType->getFieldLayout(), 'entry', 0, ['entry'], [$entryType->id]);

        return implode("\n", $lines) . "\n";
    }

    /**
     * The same walk in the field-handle syntax, e.g.
     * `title,heading,blocks[heading,text,rows[heading,text]]`.
     *
     * That syntax can't branch on block type, so a Matrix field lists the
     * text fields of all its block types together, each handle once, in the
     * order they first appear; a nested Matrix field gets its own bracketed
     * list the same way. It can't carry comments either, so the fields left
     * out are returned separately for the UI to report.
     *
     * @return array{handles: string, skipped: string[]}
     */
    public static function handleListForEntryType(EntryType $entryType): array
    {
        $skipped = [];
        $tree = self::layoutTree($entryType->getFieldLayout(), 0, [$entryType->id], $skipped);

        return [
            'handles' => self::serializeTree(['title' => null] + $tree),
            'skipped' => $skipped,
        ];
    }

    /**
     * Appends one line per narratable field in a field layout, and a loop for
     * each Matrix field.
     *
     * @param string[] $lines
     * @param string $var the Twig variable holding the element this layout belongs to
     * @param string[] $variables loop variable names already in scope
     * @param int[] $entryTypeIds entry types already being walked (cycle guard)
     */
    private static function appendLayout(array &$lines, ?FieldLayout $layout, string $var, int $depth, array $variables, array $entryTypeIds): void
    {
        $indent = str_repeat(self::INDENT, $depth);
        $skipped = [];

        foreach ($layout?->getCustomFields() ?? [] as $field) {
            if ($field instanceof Matrix) {
                self::appendMatrix($lines, $field, $var, $depth, $variables, $entryTypeIds);
            } elseif (self::isTextField($field)) {
                $lines[] = "{$indent}{{ {$var}.{$field->handle} }}";
            } elseif (!$field instanceof BespokenField) {
                // The Bespoken field itself is never narrated; naming it would
                // only add noise.
                $skipped[] = "{$field->handle} (" . $field::displayName() . ')';
            }
        }

        if ($skipped !== []) {
            $lines[] = "{$indent}{# Not text, left out: " . implode(', ', $skipped) . ' #}';
        }
    }

    /**
     * @param string[] $lines
     * @param string[] $variables
     * @param int[] $entryTypeIds
     */
    private static function appendMatrix(array &$lines, Matrix $field, string $var, int $depth, array $variables, array $entryTypeIds): void
    {
        $indent = str_repeat(self::INDENT, $depth);

        if ($depth >= self::MAX_DEPTH) {
            $lines[] = "{$indent}{# {$field->handle}: nested too deep to generate, add it by hand #}";
            return;
        }

        $entryTypes = $field->getEntryTypes();
        if ($entryTypes === []) {
            $lines[] = "{$indent}{# {$field->handle}: this Matrix field has no entry types #}";
            return;
        }

        $blockVar = self::blockVariable($field->handle, $variables);
        $variables[] = $blockVar;
        $lines[] = "{$indent}{% for {$blockVar} in {$var}.{$field->handle}.all() %}";

        if (count($entryTypes) === 1) {
            self::appendBlockType($lines, $entryTypes[0], $blockVar, $depth + 1, $variables, $entryTypeIds);
        } else {
            // Different block types carry different fields, so branch on the
            // type. Craft's {% switch %} tag reads better than an if/elseif chain.
            $lines[] = "{$indent}" . self::INDENT . "{% switch {$blockVar}.type.handle %}";
            foreach ($entryTypes as $entryType) {
                $lines[] = "{$indent}" . str_repeat(self::INDENT, 2) . "{% case \"{$entryType->handle}\" %}";
                self::appendBlockType($lines, $entryType, $blockVar, $depth + 3, $variables, $entryTypeIds);
            }
            $lines[] = "{$indent}" . self::INDENT . '{% endswitch %}';
        }

        $lines[] = "{$indent}{% endfor %}";
    }

    /**
     * @param string[] $lines
     * @param string[] $variables
     * @param int[] $entryTypeIds
     */
    private static function appendBlockType(array &$lines, EntryType $entryType, string $var, int $depth, array $variables, array $entryTypeIds): void
    {
        $indent = str_repeat(self::INDENT, $depth);

        if (in_array($entryType->id, $entryTypeIds, true)) {
            // An entry type that contains itself would loop forever.
            $lines[] = "{$indent}{# {$entryType->handle} blocks contain more {$entryType->handle} blocks; add the deeper levels by hand #}";
            return;
        }

        if ($entryType->hasTitleField) {
            $lines[] = "{$indent}{{ {$var}.title }}";
        }

        $entryTypeIds[] = $entryType->id;
        self::appendLayout($lines, $entryType->getFieldLayout(), $var, $depth, $variables, $entryTypeIds);
    }

    /**
     * The narratable fields of a layout as an ordered map: handle => null for a
     * text field, or the map of a Matrix field's blocks' fields, merged across
     * its block types.
     *
     * @param string[] $skipped
     * @param int[] $entryTypeIds entry types already being walked (cycle guard)
     * @return array<string, array|null>
     */
    private static function layoutTree(?FieldLayout $layout, int $depth, array $entryTypeIds, array &$skipped): array
    {
        $tree = [];

        foreach ($layout?->getCustomFields() ?? [] as $field) {
            if ($field instanceof Matrix) {
                if ($depth >= self::MAX_DEPTH) {
                    $skipped[] = "{$field->handle} (nested too deep to generate)";
                    continue;
                }
                $children = [];
                foreach ($field->getEntryTypes() as $entryType) {
                    if (in_array($entryType->id, $entryTypeIds, true)) {
                        // An entry type that contains itself would loop forever.
                        continue;
                    }
                    $children = self::mergeTrees(
                        $children,
                        self::layoutTree($entryType->getFieldLayout(), $depth + 1, [...$entryTypeIds, $entryType->id], $skipped),
                    );
                }
                if ($children === []) {
                    $skipped[] = "{$field->handle} (Matrix with no text fields)";
                    continue;
                }
                // Handles are unique within a layout, so nothing to merge here;
                // merging across block types happens in mergeTrees().
                $tree[$field->handle] = $children;
            } elseif (self::isTextField($field)) {
                $tree[$field->handle] ??= null;
            } elseif (!$field instanceof BespokenField) {
                $skipped[] = "{$field->handle} (" . $field::displayName() . ')';
            }
        }

        return $tree;
    }

    /**
     * Merges two layout trees, keeping the first tree's order and adding what
     * only the second has. Where both have a Matrix field of the same handle,
     * their children are merged too.
     *
     * @param array<string, array|null> $first
     * @param array<string, array|null> $second
     * @return array<string, array|null>
     */
    private static function mergeTrees(array $first, array $second): array
    {
        foreach ($second as $handle => $children) {
            if (!array_key_exists($handle, $first)) {
                $first[$handle] = $children;
            } elseif (is_array($first[$handle]) && is_array($children)) {
                $first[$handle] = self::mergeTrees($first[$handle], $children);
            }
        }

        return $first;
    }

    /**
     * @param array<string, array|null> $tree
     */
    private static function serializeTree(array $tree): string
    {
        $parts = [];
        foreach ($tree as $handle => $children) {
            $parts[] = is_array($children) ? $handle . '[' . self::serializeTree($children) . ']' : $handle;
        }

        return implode(',', $parts);
    }

    private static function isTextField(FieldInterface $field): bool
    {
        return in_array(get_class($field), self::TEXT_FIELD_CLASSES, true);
    }

    /**
     * A readable loop variable for a Matrix field's blocks: `rows` becomes
     * `row`, `list` becomes `listItem`; a numeric suffix avoids shadowing a
     * variable already in scope.
     *
     * @param string[] $variables
     */
    private static function blockVariable(string $handle, array $variables): string
    {
        $base = strlen($handle) > 1 && str_ends_with($handle, 's')
            ? substr($handle, 0, -1)
            : $handle . 'Item';

        $name = $base;
        $suffix = 2;
        while (in_array($name, $variables, true) || in_array($name, self::RESERVED_VARIABLES, true)) {
            $name = $base . $suffix++;
        }

        return $name;
    }
}
