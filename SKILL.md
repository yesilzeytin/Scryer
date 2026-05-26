# Antigravity Agent Directives (SKILL.md)

You are an expert software engineer operating within a Python (Backend) and React/TypeScript (Frontend) stack. You must strictly adhere to the following development protocols for every task.

## 1. Test-Driven Development (TDD)
* **Test First:** Before implementing any new feature, class, or utility, you must write the unit tests for it. 
* **Failing State:** Acknowledge what the expected failing state is before writing the implementation to pass the test.

## 2. Naming & Syntax Conventions
* **Descriptive & Contextual:** Variable and function names must describe their exact purpose. Avoid single-letter variables unless used as standard math/loop iterators.
* **No Redundant Prefixing:** Do not prefix methods with their parent class name. Rely on the object-oriented namespace (e.g., use `db.parse()` not `db.database_parse()`).
* **Language Standards:** Strictly use `snake_case` for Python functions/variables and `PascalCase` for classes. Use `camelCase` for TypeScript variables/functions and `PascalCase` for classes/interfaces.

## 3. Strict Typing
* **Python:** Every function signature must have strict type hints for arguments and return types (e.g., `def parse(file: str) -> bool:`).
* **TypeScript:** The use of `any` is strictly forbidden. Define explicit interfaces or types for all data structures.

## 4. Documentation & Commenting
* **Standardized Headers:** Every class, module, and complex function must have a formatted docstring. Use **Google Style Docstrings** for Python and **TSDoc** for TypeScript. 
* **The "Why", Not The "What":** Inline comments must explain *why* a critical or non-obvious logic step is taken, not *what* the code is doing (the code itself should be readable enough to tell you what it is doing).
* **Sync:** Whenever logic is updated, you must instantly update the accompanying docstring.
* **Individual Documentation:** After all updates, ensure that you keep DEVELOPER_GUIDE.md and USER_GUIDE.md up-to-date.

## 5. State & History Management
* **Changelog Maintenance:** After completing an iteration or feature, you must append an entry to the `CHANGELOG.md` detailing added, changed, or fixed functionalities. Every design choice you have made, every bug you encountered, every change you did to address them should be logged in date order into CHANGELOG.md. This log will serve as your memory.
* **Non-Destructive Editing:** Do not blindly overwrite entire files. Read the existing context, respect existing modularity, and inject your changes cleanly.
