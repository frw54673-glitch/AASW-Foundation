# MIS Phase 3–4 Delivery Record

## Operational modules

| Module | Protected workflow | Key controls |
| --- | --- | --- |
| Project team | Assign staff, role, responsibilities, contact window and active status to a project. | Admin and Project Manager creation access; records stay project-bound. |
| Finance | Record budget lines and expenses in Indian rupees, with Finance approval status. | Finance/Admin-only budget, expense and approval APIs; monetary values are stored as precise decimals. |
| Documents | Register document metadata and upload PDF, images, DOC or DOCX to managed storage. | Server-side file-type check, 10 MB limit, private storage key persistence and visibility controls. |
| Monitoring | Define input, output and outcome indicators with baseline, target and current values. | Admin, Project Manager and Monitoring Officer creation access. |
| Risks | Maintain a severity/likelihood register, mitigation plan, owner, due date and lifecycle. | Server returns a calculated risk score; Project Manager/Admin creation access. |
| Reporting | Schedule monthly, quarterly, annual, donor and field reports. | Due-date alert uses red for overdue, amber within seven days, green on track and blue for draft/pending. |

## Role and privacy boundary

The operational router is protected on the server. Field Staff can work with delivery and document records but cannot enter financial budgets or expenses. Finance can manage budgets and expense approval states. Monitoring Officers can define performance indicators. Project Managers and Admins handle project-team, risk and report controls. No documents are inserted as placeholder data; every actual record begins with an authorized Foundation user.
