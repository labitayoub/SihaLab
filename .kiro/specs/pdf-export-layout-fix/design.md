# PDF Export Layout Fix Design

## Overview

The OrdonnanceView component in `frontend/src/pages/medical/Ordonnances.tsx` displays a medical prescription that can be exported as a PDF. While the print preview correctly shows a single-page A4 document, the actual PDF export fragments into 3 pages with broken layout. This occurs because the browser's print-to-PDF mechanism does not respect CSS layout constraints during export, causing content overflow and pagination issues.

The fix will enforce strict height constraints, use inline styles with !important declarations for critical layout properties, and constrain the medications list to prevent overflow. This ensures the exported PDF matches the preview by preventing the browser from breaking the page during PDF generation.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a user exports/saves the ordonnance as a PDF using the print dialog, resulting in a fragmented 3-page document
- **Property (P)**: The desired behavior - the exported PDF should be exactly 1 page with proper header alignment, signature positioning, and footer placement matching the preview
- **Preservation**: Existing behaviors that must remain unchanged - print preview display, non-truncated medication lists when content fits, modal dialog styling, watermark rendering, and doctor contact information display
- **OrdonnanceView**: The React component in `frontend/src/pages/medical/Ordonnances.tsx` (line 26) that renders the prescription document
- **ordonnance-a4**: The CSS class that defines the A4 page container with dimensions 210mm x 297mm
- **med-content**: The CSS class that wraps the medications list section
- **signature-area**: The absolutely positioned element at bottom: 160px containing the signature box
- **doc-footer**: The absolutely positioned element at bottom: 32px containing footer information

## Bug Details

### Bug Condition

The bug manifests when a user clicks the print/export button and uses the browser's "Save as PDF" functionality in the print dialog. The OrdonnanceView component renders correctly in the print preview but the PDF export process does not respect the CSS height constraints, flex layout properties, and absolute positioning, causing the content to overflow beyond the 297mm A4 boundary and fragment across multiple pages.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { action: string, outputFormat: string }
  OUTPUT: boolean
  
  RETURN input.action == 'export' 
         AND input.outputFormat == 'PDF'
         AND pdfPageCount(output) > 1
         AND (headerLayoutBroken(output) OR signaturePositionIncorrect(output) OR footerPositionIncorrect(output))
END FUNCTION
```

### Examples

- **Example 1**: User opens ordonnance modal, clicks print button, selects "Save as PDF" → Expected: 1-page PDF with header aligned using flex space-between. Actual: 3-page PDF with header elements stacked vertically
- **Example 2**: User exports ordonnance with 5 medications → Expected: All medications visible on page 1 with signature at bottom: 160px. Actual: Medications overflow to page 2, signature appears on page 3
- **Example 3**: User exports ordonnance → Expected: Footer at bottom: 32px on page 1. Actual: Footer appears on page 3 separated from content
- **Edge Case**: User exports ordonnance with 2 medications (fits within space) → Expected: No truncation, proper layout on 1 page. Actual: Still fragments into multiple pages due to lack of height enforcement

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Print preview dialog must continue to display the correct 1-page layout before export
- Ordonnances with fewer medications that naturally fit within the page must continue to display them without truncation
- Modal dialog (non-print view) must continue to render with current visual styling including box shadow
- Watermark background must continue to display at 5% opacity centered in the page
- Doctor's contact information in the header must continue to show address, city, and phone number in the right-aligned section

**Scope:**
All inputs that do NOT involve the PDF export action should be completely unaffected by this fix. This includes:
- Viewing the ordonnance in the modal dialog
- Viewing the print preview (before clicking save/export)
- Rendering the ordonnance on screen with normal styling
- Any other interactions with the ordonnance component that don't involve PDF generation

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Insufficient Height Enforcement**: The `.ordonnance-a4` class sets `height: 297mm` but does not use `min-height`, `max-height`, and `overflow: hidden` together to strictly enforce the boundary during PDF export. The browser's PDF engine may ignore the single height property.

2. **CSS Specificity Issues in Print Context**: The `.header-flex` uses `display: flex` and `justify-content: space-between` in a stylesheet, but these properties may be overridden or ignored during PDF export. Inline styles with `!important` declarations are more reliably respected by print engines.

3. **Absolute Positioning Without Fixed Container**: The `.signature-area` (bottom: 160px) and `.doc-footer` (bottom: 32px) use absolute positioning, but if the parent container's height is not strictly enforced during export, these elements float to incorrect positions or separate pages.

4. **Unconstrained Content Overflow**: The `.med-content` class sets `max-height: 600px` and `overflow: hidden`, but this may be insufficient. The medications list can push content beyond the page boundary if the max-height is not aggressive enough or if padding-bottom (192px) is not accounted for properly.

5. **Print Media Query Limitations**: The `@media print` block removes box-shadow and border-radius but does not add additional constraints to enforce the single-page layout during PDF generation.

## Correctness Properties

Property 1: Bug Condition - PDF Export Single Page Layout

_For any_ PDF export action where the user saves the ordonnance using the browser's print-to-PDF functionality, the fixed OrdonnanceView component SHALL produce exactly 1 page with proper header flex alignment (space-between), signature positioned at bottom: 160px, footer positioned at bottom: 32px, and all content constrained within the 297mm height boundary.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - Non-Export Display Behavior

_For any_ rendering context that is NOT a PDF export (print preview, modal dialog view, screen display), the fixed OrdonnanceView component SHALL produce exactly the same visual output as the original component, preserving the current layout, styling, box shadow, watermark opacity, and content display without any truncation when content naturally fits.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `frontend/src/pages/medical/Ordonnances.tsx`

**Function**: `OrdonnanceView` (line 26)

**Specific Changes**:

1. **Enforce Strict Height Constraints on A4 Container**:
   - Modify `.ordonnance-a4` CSS class to include `min-height: 297mm`, `max-height: 297mm`, and `overflow: hidden` (in addition to existing `height: 297mm`)
   - This triple constraint ensures the browser's PDF engine cannot expand the container beyond one page

2. **Use Inline Styles for Header Flex Layout**:
   - Replace the `.header-flex` CSS class with inline styles on the header div
   - Add `style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}` with `!important` declarations in the style tag if needed
   - This ensures the flex layout is respected during PDF export

3. **Strengthen Medications Content Constraints**:
   - Reduce `.med-content` max-height from 600px to 650px to account for all header and metadata space
   - Ensure `overflow: hidden` is enforced
   - Verify padding-bottom: 192px provides sufficient space for signature and footer

4. **Add Print-Specific Height Enforcement**:
   - In the `@media print` block, add explicit rules: `.ordonnance-a4 { min-height: 297mm !important; max-height: 297mm !important; overflow: hidden !important; page-break-inside: avoid !important; }`
   - This provides additional insurance that the PDF engine respects the constraints

5. **Verify Absolute Positioning Context**:
   - Ensure `.signature-area` and `.doc-footer` remain absolutely positioned relative to `.ordonnance-a4`
   - Confirm that with the strict height enforcement, these elements will stay within the single page boundary

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code by exporting PDFs and analyzing page count and layout, then verify the fix works correctly and preserves existing behavior in non-export contexts.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Manually export ordonnances as PDFs using the current unfixed code and analyze the output. Open the exported PDFs and count pages, check header alignment, verify signature and footer positioning. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Multi-Page Export Test**: Export an ordonnance with 5+ medications as PDF (will fail on unfixed code - expect 3 pages)
2. **Header Layout Test**: Examine the exported PDF header section (will fail on unfixed code - expect broken flex layout with stacked elements)
3. **Signature Position Test**: Check signature location in exported PDF (will fail on unfixed code - expect signature on page 2 or 3 instead of bottom of page 1)
4. **Footer Position Test**: Check footer location in exported PDF (will fail on unfixed code - expect footer on page 3 instead of bottom of page 1)
5. **Short Content Test**: Export an ordonnance with 2 medications (may fail on unfixed code - expect fragmentation even with minimal content)

**Expected Counterexamples**:
- Exported PDFs contain 3 pages instead of 1
- Header elements are vertically stacked instead of horizontally aligned with space-between
- Signature area appears on page 2 or 3 instead of bottom: 160px on page 1
- Footer appears on page 3 instead of bottom: 32px on page 1
- Possible causes: insufficient height enforcement, CSS specificity issues, absolute positioning without fixed container, unconstrained content overflow

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (PDF export actions), the fixed function produces the expected behavior (1-page PDF with correct layout).

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := OrdonnanceView_fixed.exportPDF(input)
  ASSERT result.pageCount == 1
  ASSERT result.headerLayout == 'flex-space-between'
  ASSERT result.signaturePosition == 'bottom-160px-page-1'
  ASSERT result.footerPosition == 'bottom-32px-page-1'
  ASSERT result.contentHeight <= 297mm
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (non-export rendering contexts), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT OrdonnanceView_original.render(input) == OrdonnanceView_fixed.render(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (different ordonnance data, medication counts, doctor information)
- It catches edge cases that manual unit tests might miss (empty fields, long text, special characters)
- It provides strong guarantees that behavior is unchanged for all non-export rendering contexts

**Test Plan**: Observe behavior on UNFIXED code first for print preview, modal dialog view, and screen rendering, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Print Preview Preservation**: Observe that print preview shows correct 1-page layout on unfixed code, then write test to verify this continues after fix (should remain unchanged)
2. **Modal Dialog Styling Preservation**: Observe that modal dialog renders with box shadow and proper styling on unfixed code, then write test to verify this continues after fix
3. **Content Display Preservation**: Observe that ordonnances with 2-3 medications display without truncation on unfixed code, then write test to verify this continues after fix
4. **Watermark Rendering Preservation**: Observe that watermark displays at 5% opacity centered on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test that `.ordonnance-a4` container has min-height, max-height, and overflow: hidden set to 297mm
- Test that header div uses inline styles or !important declarations for flex layout
- Test that `.med-content` max-height is set to 650px with overflow: hidden
- Test that signature and footer absolute positioning values are correct (160px and 32px)
- Test edge cases: empty medications list, single medication, maximum medications that fit

### Property-Based Tests

- Generate random ordonnance data (varying medication counts, doctor info, patient names) and verify PDF export produces 1 page
- Generate random ordonnance configurations and verify print preview continues to display correctly (preservation)
- Test that all non-export rendering contexts produce identical output before and after fix across many scenarios

### Integration Tests

- Test full PDF export flow: open modal → click print → save as PDF → verify 1-page output with correct layout
- Test print preview flow: open modal → click print → verify preview shows 1 page → cancel (no export)
- Test that exported PDF can be opened in multiple PDF viewers and displays correctly
- Test visual regression: compare screenshots of modal dialog view before and after fix to ensure no visual changes
