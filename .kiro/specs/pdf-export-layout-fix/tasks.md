# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - PDF Export Single Page Layout
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - PDF export actions with ordonnances containing 5+ medications
  - Test that when a user exports an ordonnance as PDF using the print dialog, the system produces exactly 1 page (not 3 pages)
  - Test that the exported PDF maintains proper header flex layout with space-between alignment
  - Test that the signature area remains positioned at bottom: 160px on page 1
  - Test that the footer remains positioned at bottom: 32px on page 1
  - Test that all content is constrained within the 297mm height boundary
  - The test assertions should match: pageCount == 1, headerLayout == 'flex-space-between', signaturePosition == 'bottom-160px-page-1', footerPosition == 'bottom-32px-page-1', contentHeight <= 297mm
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: exported PDFs contain 3 pages, header elements stacked vertically, signature on page 2/3, footer on page 3
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Export Display Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (print preview, modal dialog view, screen rendering)
  - Observe: Print preview displays correct 1-page layout on unfixed code
  - Observe: Modal dialog renders with box shadow and proper styling on unfixed code
  - Observe: Ordonnances with 2-3 medications display without truncation on unfixed code
  - Observe: Watermark displays at 5% opacity centered on unfixed code
  - Observe: Doctor's contact information displays correctly in header right section on unfixed code
  - Write property-based tests capturing observed behavior patterns: for all non-export rendering contexts, the component produces the same visual output as the original
  - Property-based testing generates many test cases (varying medication counts, doctor info, patient names) for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix for PDF export layout fragmentation

  - [ ] 3.1 Enforce strict height constraints on A4 container
    - Modify `.ordonnance-a4` CSS class to include `min-height: 297mm`, `max-height: 297mm`, and `overflow: hidden`
    - Keep existing `height: 297mm` property
    - This triple constraint ensures the browser's PDF engine cannot expand the container beyond one page
    - _Bug_Condition: isBugCondition(input) where input.action == 'export' AND input.outputFormat == 'PDF'_
    - _Expected_Behavior: pdfPageCount(output) == 1 AND contentHeight <= 297mm_
    - _Preservation: Print preview, modal dialog view, and screen rendering must remain unchanged_
    - _Requirements: 1.5, 2.5_

  - [ ] 3.2 Use inline styles for header flex layout
    - Replace the `.header-flex` CSS class with inline styles on the header div in OrdonnanceView component
    - Add `style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}`
    - If needed, add `!important` declarations in the style tag to ensure PDF export respects the layout
    - This ensures the flex layout is respected during PDF export
    - _Bug_Condition: isBugCondition(input) where headerLayoutBroken(output) == true_
    - _Expected_Behavior: headerLayout == 'flex-space-between' in exported PDF_
    - _Preservation: Header must continue to display correctly in print preview and modal dialog_
    - _Requirements: 1.2, 2.2, 3.5_

  - [ ] 3.3 Strengthen medications content constraints
    - Modify `.med-content` CSS class to set `max-height: 650px` (increased from 600px)
    - Ensure `overflow: hidden` is enforced
    - Verify `padding-bottom: 192px` provides sufficient space for signature and footer
    - This prevents medications list from overflowing beyond page boundaries
    - _Bug_Condition: isBugCondition(input) where medicationsOverflow(output) == true_
    - _Expected_Behavior: medicationsContent constrained within page, no overflow to page 2_
    - _Preservation: Ordonnances with fewer medications must continue to display without truncation_
    - _Requirements: 1.4, 2.4, 3.2_

  - [ ] 3.4 Add print-specific height enforcement
    - In the `@media print` block, add explicit rules for `.ordonnance-a4`
    - Add: `min-height: 297mm !important; max-height: 297mm !important; overflow: hidden !important; page-break-inside: avoid !important;`
    - This provides additional insurance that the PDF engine respects the constraints
    - _Bug_Condition: isBugCondition(input) where PDF export ignores CSS height constraints_
    - _Expected_Behavior: PDF engine enforces single-page layout with strict height boundary_
    - _Preservation: Print preview must continue to display correctly_
    - _Requirements: 1.5, 2.5, 3.1_

  - [ ] 3.5 Verify absolute positioning context
    - Ensure `.signature-area` remains absolutely positioned at `bottom: 160px` relative to `.ordonnance-a4`
    - Ensure `.doc-footer` remains absolutely positioned at `bottom: 32px` relative to `.ordonnance-a4`
    - Confirm that with the strict height enforcement, these elements stay within the single page boundary
    - _Bug_Condition: isBugCondition(input) where signaturePositionIncorrect(output) OR footerPositionIncorrect(output)_
    - _Expected_Behavior: signaturePosition == 'bottom-160px-page-1' AND footerPosition == 'bottom-32px-page-1'_
    - _Preservation: Signature and footer must continue to display correctly in print preview and modal dialog_
    - _Requirements: 1.3, 2.3_

  - [ ] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - PDF Export Single Page Layout
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify exported PDF is exactly 1 page with proper header alignment, signature at bottom: 160px, footer at bottom: 32px
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Export Display Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm print preview, modal dialog styling, content display, watermark rendering, and doctor contact info all remain unchanged
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise
  - Verify exported PDFs are single-page with correct layout across multiple test cases
  - Verify no visual regressions in print preview or modal dialog view
  - Confirm the fix is complete and ready for deployment
