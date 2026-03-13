# Bugfix Requirements Document

## Introduction

The OrdonnanceView component displays a medical prescription (ordonnance) that can be printed/exported as a PDF. The print preview correctly shows a single-page A4 document with proper layout, but when the PDF is actually saved/exported, it fragments into 3 pages with broken header alignment, signature positioning, and footer placement. This bug affects the usability of the prescription system as exported PDFs are not usable for medical purposes.

The root cause is that the browser's print-to-PDF mechanism does not respect the CSS layout constraints during export, causing content overflow and pagination issues that don't appear in the preview.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user exports/saves the ordonnance as a PDF using the print dialog THEN the system produces a 3-page PDF with fragmented content

1.2 WHEN the PDF is exported THEN the header alignment breaks and does not maintain the flex layout with space-between justification

1.3 WHEN the PDF is exported THEN the signature area and footer lose their absolute positioning and appear on incorrect pages

1.4 WHEN the medications list exceeds the available space THEN the content overflows beyond the A4 page boundaries causing additional pages

1.5 WHEN the PDF export occurs THEN the 297mm height constraint is not enforced, allowing content to expand beyond one page

### Expected Behavior (Correct)

2.1 WHEN a user exports/saves the ordonnance as a PDF using the print dialog THEN the system SHALL produce exactly 1 page matching the preview layout

2.2 WHEN the PDF is exported THEN the header SHALL maintain proper flex layout with space-between alignment using inline styles and !important declarations

2.3 WHEN the PDF is exported THEN the signature area SHALL remain positioned at bottom: 160px and the footer at bottom: 32px relative to the fixed 297mm container

2.4 WHEN the medications list content is rendered THEN the system SHALL constrain it to max-height: 650px with overflow hidden to prevent page breaks

2.5 WHEN the PDF export occurs THEN the system SHALL enforce a strict height of 297mm (minHeight, maxHeight, and overflow: hidden) on the A4 container

### Unchanged Behavior (Regression Prevention)

3.1 WHEN viewing the ordonnance in the print preview dialog THEN the system SHALL CONTINUE TO display the correct 1-page layout

3.2 WHEN the ordonnance contains fewer medications that fit within the page THEN the system SHALL CONTINUE TO display them without truncation

3.3 WHEN the ordonnance is displayed in the modal dialog (non-print view) THEN the system SHALL CONTINUE TO render with the current visual styling and box shadow

3.4 WHEN the watermark background is rendered THEN the system SHALL CONTINUE TO display at 5% opacity centered in the page

3.5 WHEN the doctor's contact information is displayed in the header THEN the system SHALL CONTINUE TO show address, city, and phone number in the right-aligned section
