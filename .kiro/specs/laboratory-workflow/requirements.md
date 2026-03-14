# Requirements Document

## Introduction

The Laboratory Workflow feature enables laboratories to manage analysis requests, input test results, and generate professional laboratory reports within the SihatiHub medical platform. Currently, doctors can create analysis requests and assign them to laboratories, but laboratories lack the interface to view pending requests, enter results, and produce standardized lab reports. This feature completes the analysis workflow by providing laboratories with dedicated tools to fulfill their role in the patient care cycle.

## Glossary

- **Laboratory_System**: The laboratory workflow module that enables laboratory users to manage analysis requests
- **Analysis_Request**: An Analyse entity created by a doctor during a consultation, assigned to a laboratory
- **Lab_Dashboard**: The main interface where laboratory users view and manage their assigned analysis requests
- **Result_Entry_Form**: The interface where laboratory users input test results for an analysis request
- **Lab_Report_PDF**: The professional laboratory report document generated when an analysis is completed
- **Prescription_PDF**: The doctor's analysis request document (demande d'analyse) - existing functionality
- **Test_Result**: Individual measurement or observation recorded for a specific test within an analysis
- **Normal_Range**: The reference interval for a test result indicating typical healthy values
- **Audit_Trail**: The system record tracking who entered results and when modifications occurred
- **Analysis_Status**: The current state of an analysis request (EN_ATTENTE, EN_COURS, TERMINEE)
- **Biologist**: The laboratory professional responsible for validating and signing laboratory reports
- **Patient_Dossier**: The patient's medical record where both prescription and lab report PDFs are stored

## Requirements

### Requirement 1: Laboratory Dashboard Access

**User Story:** As a laboratory user, I want to view all analysis requests assigned to my laboratory, so that I can manage my workload and prioritize urgent tests.

#### Acceptance Criteria

1. WHEN a laboratory user logs in, THE Laboratory_System SHALL display the Lab_Dashboard
2. THE Lab_Dashboard SHALL display all Analysis_Requests where labId matches the laboratory user's ID
3. FOR EACH Analysis_Request, THE Lab_Dashboard SHALL display patient name, doctor name, request date, and Analysis_Status
4. THE Lab_Dashboard SHALL sort Analysis_Requests by createdAt in descending order (newest first)
5. WHEN an Analysis_Request has Analysis_Status of EN_ATTENTE, THE Lab_Dashboard SHALL display it in the pending section
6. WHEN an Analysis_Request has Analysis_Status of EN_COURS, THE Lab_Dashboard SHALL display it in the in-progress section
7. WHEN an Analysis_Request has Analysis_Status of TERMINEE, THE Lab_Dashboard SHALL display it in the completed section

### Requirement 2: Dashboard Filtering and Search

**User Story:** As a laboratory user, I want to filter and search analysis requests, so that I can quickly find specific requests.

#### Acceptance Criteria

1. THE Lab_Dashboard SHALL provide a filter control for Analysis_Status
2. WHEN a laboratory user selects a status filter, THE Lab_Dashboard SHALL display only Analysis_Requests matching that Analysis_Status
3. THE Lab_Dashboard SHALL provide a search input field
4. WHEN a laboratory user enters text in the search field, THE Lab_Dashboard SHALL filter Analysis_Requests by patient name or doctor name containing the search text
5. THE Lab_Dashboard SHALL update the displayed Analysis_Requests within 500ms of filter or search changes

### Requirement 3: Result Entry Interface Access

**User Story:** As a laboratory user, I want to open an analysis request to enter results, so that I can record test findings.

#### Acceptance Criteria

1. WHEN a laboratory user clicks on an Analysis_Request in the Lab_Dashboard, THE Laboratory_System SHALL display the Result_Entry_Form
2. THE Result_Entry_Form SHALL display the complete Analysis_Request description
3. THE Result_Entry_Form SHALL display patient information including firstName, lastName, and consultation date
4. THE Result_Entry_Form SHALL display doctor information including firstName, lastName, and specialite
5. WHEN the Analysis_Request has Analysis_Status of TERMINEE, THE Result_Entry_Form SHALL display results in read-only mode

### Requirement 4: Test Result Input

**User Story:** As a laboratory user, I want to input individual test results with values and units, so that I can record detailed findings.

#### Acceptance Criteria

1. THE Result_Entry_Form SHALL provide input fields for test name, result value, unit, and Normal_Range
2. THE Result_Entry_Form SHALL allow adding multiple Test_Results to a single Analysis_Request
3. THE Result_Entry_Form SHALL allow removing Test_Results before submission
4. WHEN a laboratory user enters a result value, THE Result_Entry_Form SHALL validate that the value is not empty
5. THE Result_Entry_Form SHALL store all Test_Results as structured JSON in the Analyse.resultat field

### Requirement 5: Analysis Status Management

**User Story:** As a laboratory user, I want to update the analysis status as I work on it, so that doctors and patients can track progress.

#### Acceptance Criteria

1. WHEN a laboratory user opens an Analysis_Request with Analysis_Status EN_ATTENTE, THE Laboratory_System SHALL update Analysis_Status to EN_COURS
2. THE Result_Entry_Form SHALL provide a "Mark as Complete" action button
3. WHEN a laboratory user clicks "Mark as Complete", THE Laboratory_System SHALL validate that at least one Test_Result has been entered
4. WHEN validation passes, THE Laboratory_System SHALL update Analysis_Status to TERMINEE
5. WHEN Analysis_Status is updated to TERMINEE, THE Laboratory_System SHALL set dateResultat to the current timestamp
6. IF no Test_Results have been entered, THEN THE Laboratory_System SHALL display an error message and prevent status change to TERMINEE

### Requirement 6: Laboratory Report PDF Generation

**User Story:** As a laboratory user, I want the system to automatically generate a professional lab report PDF when I complete an analysis, so that results are properly documented.

#### Acceptance Criteria

1. WHEN Analysis_Status is updated to TERMINEE, THE Laboratory_System SHALL generate a Lab_Report_PDF
2. THE Lab_Report_PDF SHALL include laboratory header with laboratory name, address, ville, and phone
3. THE Lab_Report_PDF SHALL include patient information: firstName, lastName, and age calculated from consultation date
4. THE Lab_Report_PDF SHALL include doctor information: firstName, lastName, and specialite
5. THE Lab_Report_PDF SHALL include analysis request date and completion date (dateResultat)
6. THE Lab_Report_PDF SHALL include a results table with columns: test name, result value, Normal_Range, and unit
7. FOR EACH Test_Result, THE Lab_Report_PDF SHALL display one row in the results table
8. THE Lab_Report_PDF SHALL include a footer section for biologist signature and laboratory stamp
9. THE Laboratory_System SHALL store the Lab_Report_PDF URL in Analyse.resultatFileUrl
10. THE Lab_Report_PDF SHALL use a distinct template from the Prescription_PDF

### Requirement 7: Abnormal Result Highlighting

**User Story:** As a laboratory user, I want abnormal test results to be highlighted in the lab report, so that doctors can quickly identify concerning values.

#### Acceptance Criteria

1. WHERE a Test_Result includes a Normal_Range, THE Result_Entry_Form SHALL allow marking the result as abnormal
2. WHEN a Test_Result is marked as abnormal, THE Lab_Report_PDF SHALL display that result value in red color
3. WHEN a Test_Result is within normal range, THE Lab_Report_PDF SHALL display that result value in black color
4. THE Lab_Report_PDF SHALL display the Normal_Range value next to each Test_Result for reference

### Requirement 8: Patient Dossier Medical Integration

**User Story:** As a patient, I want to see both the doctor's analysis request and the laboratory results in my medical record, so that I have complete documentation.

#### Acceptance Criteria

1. THE Patient_Dossier SHALL display both Prescription_PDF and Lab_Report_PDF for each Analysis_Request
2. THE Patient_Dossier SHALL label the Prescription_PDF as "Demande d'Analyse"
3. THE Patient_Dossier SHALL label the Lab_Report_PDF as "Résultats Laboratoire"
4. WHEN Analysis_Status is EN_ATTENTE or EN_COURS, THE Patient_Dossier SHALL display only the Prescription_PDF
5. WHEN Analysis_Status is TERMINEE, THE Patient_Dossier SHALL display both Prescription_PDF and Lab_Report_PDF
6. THE Patient_Dossier SHALL display a status indicator showing whether results are available

### Requirement 9: Doctor Notification

**User Story:** As a doctor, I want to be notified when a laboratory completes an analysis I requested, so that I can review results promptly.

#### Acceptance Criteria

1. WHEN Analysis_Status is updated to TERMINEE, THE Laboratory_System SHALL create a notification for the doctor
2. THE notification SHALL include patient firstName and lastName
3. THE notification SHALL include the Analysis_Request description
4. THE notification SHALL include a link to view the Lab_Report_PDF
5. THE Laboratory_System SHALL deliver the notification within 5 seconds of status update

### Requirement 10: Access Control and Security

**User Story:** As a system administrator, I want to ensure only authorized laboratories can view and modify their assigned analyses, so that patient data remains secure.

#### Acceptance Criteria

1. WHEN a laboratory user requests the Lab_Dashboard, THE Laboratory_System SHALL return only Analysis_Requests where labId matches the user's ID
2. WHEN a laboratory user attempts to access an Analysis_Request, THE Laboratory_System SHALL verify that labId matches the user's ID
3. IF labId does not match the user's ID, THEN THE Laboratory_System SHALL return a 403 Forbidden error
4. WHEN a laboratory user attempts to update an Analysis_Request, THE Laboratory_System SHALL verify that labId matches the user's ID
5. IF labId does not match the user's ID, THEN THE Laboratory_System SHALL return a 403 Forbidden error and prevent modification

### Requirement 11: Result Modification Restrictions

**User Story:** As a laboratory manager, I want to prevent modification of completed analysis results, so that we maintain data integrity and audit compliance.

#### Acceptance Criteria

1. WHEN Analysis_Status is TERMINEE, THE Laboratory_System SHALL prevent modification of Test_Results
2. WHEN a laboratory user attempts to update an Analysis_Request with Analysis_Status TERMINEE, THE Laboratory_System SHALL return a 400 Bad Request error
3. THE Laboratory_System SHALL display an error message indicating that completed analyses cannot be modified
4. THE Result_Entry_Form SHALL disable all input fields when Analysis_Status is TERMINEE

### Requirement 12: Audit Trail

**User Story:** As a laboratory manager, I want to track who entered results and when, so that we can maintain accountability and traceability.

#### Acceptance Criteria

1. WHEN a laboratory user updates an Analysis_Request, THE Laboratory_System SHALL record the user's ID in an audit field
2. WHEN Analysis_Status is updated to TERMINEE, THE Laboratory_System SHALL record the completion timestamp in dateResultat
3. THE Laboratory_System SHALL preserve the original createdAt timestamp showing when the doctor created the Analysis_Request
4. THE Laboratory_System SHALL update the updatedAt timestamp whenever the Analysis_Request is modified

### Requirement 13: Input Validation

**User Story:** As a laboratory user, I want the system to validate my input, so that I can catch errors before submitting results.

#### Acceptance Criteria

1. WHEN a laboratory user enters a Test_Result, THE Result_Entry_Form SHALL validate that test name is not empty
2. WHEN a laboratory user enters a Test_Result, THE Result_Entry_Form SHALL validate that result value is not empty
3. IF validation fails, THEN THE Result_Entry_Form SHALL display an error message indicating which field is invalid
4. THE Result_Entry_Form SHALL prevent submission until all validation errors are resolved
5. WHEN a laboratory user attempts to mark an Analysis_Request as complete, THE Laboratory_System SHALL validate that at least one Test_Result exists

### Requirement 14: PDF Storage Integration

**User Story:** As a system administrator, I want laboratory report PDFs stored in our existing MinIO service, so that we maintain consistent file storage architecture.

#### Acceptance Criteria

1. WHEN THE Laboratory_System generates a Lab_Report_PDF, THE Laboratory_System SHALL upload the PDF to MinIO
2. THE Laboratory_System SHALL store the PDF in a bucket named "laboratory-reports"
3. THE Laboratory_System SHALL generate a unique filename using the pattern: "lab_report_{analyseId}_{timestamp}.pdf"
4. WHEN the upload succeeds, THE Laboratory_System SHALL store the MinIO URL in Analyse.resultatFileUrl
5. IF the upload fails, THEN THE Laboratory_System SHALL return an error and prevent Analysis_Status update to TERMINEE

### Requirement 15: Existing Consultation Integration

**User Story:** As a doctor, I want laboratory results to appear in the consultation view, so that I can review them alongside other patient information.

#### Acceptance Criteria

1. THE consultation detail view SHALL display all Analysis_Requests associated with the consultation
2. FOR EACH Analysis_Request, THE consultation view SHALL display the current Analysis_Status
3. WHEN Analysis_Status is TERMINEE, THE consultation view SHALL provide a link to download the Lab_Report_PDF
4. THE consultation view SHALL display the dateResultat when Analysis_Status is TERMINEE
5. THE consultation view SHALL maintain the existing display of the Prescription_PDF

### Requirement 16: Laboratory Report Parser and Pretty Printer

**User Story:** As a developer, I want to parse and format laboratory report data consistently, so that reports are reliable and maintainable.

#### Acceptance Criteria

1. THE Laboratory_System SHALL provide a Parser that converts Test_Result JSON into structured objects
2. WHEN valid Test_Result JSON is provided, THE Parser SHALL parse it into an array of test result objects
3. WHEN invalid Test_Result JSON is provided, THE Parser SHALL return a descriptive error message
4. THE Laboratory_System SHALL provide a Pretty_Printer that formats test result objects into display-ready text
5. THE Pretty_Printer SHALL format test results with proper alignment and spacing for the Lab_Report_PDF
6. FOR ALL valid test result objects, parsing then printing then parsing SHALL produce equivalent objects (round-trip property)
