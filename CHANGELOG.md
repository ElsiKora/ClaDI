## [2.1.2](https://github.com/ElsiKora/ClaDI/compare/v2.1.1...v2.1.2) (2026-02-21)

## [2.1.1](https://github.com/ElsiKora/ClaDI/compare/v2.1.0...v2.1.1) (2026-02-21)

# [2.1.0](https://github.com/ElsiKora/ClaDI/compare/v2.0.2...v2.1.0) (2026-02-21)


### Features

* **container:** add advanced container operations and decorator modules ([3bcd8aa](https://github.com/ElsiKora/ClaDI/commit/3bcd8aa4f761c506d7ae3f4fbf72b98e07712f9f))
* **di:** add async optional resolution and scope creation options ([72b4dac](https://github.com/ElsiKora/ClaDI/commit/72b4dac721e8486588f1c1e2f99ef61c58d4fda9))

## [2.0.2](https://github.com/ElsiKora/ClaDI/compare/v2.0.1...v2.0.2) (2025-04-08)

## [2.0.1](https://github.com/ElsiKora/ClaDI/compare/v2.0.0...v2.0.1) (2025-04-08)

# [2.0.0](https://github.com/ElsiKora/ClaDI/compare/v1.0.4...v2.0.0) (2025-04-08)

### Code Refactoring

- **registry:** remove eservicetoken enum and update registry interface ([f112774](https://github.com/ElsiKora/ClaDI/commit/f112774910ccd6e47830d3ade26b12ef0a0c4488))

### Features

- **utility:** implement safedepclone utility for handling objects with functions ([bfa9bbe](https://github.com/ElsiKora/ClaDI/commit/bfa9bbe539690e8d50436f6299e0673e2af998e8))

### BREAKING CHANGES

- **registry:** - Remove EServiceToken enum previously used for common service registration

* Change Registry interface to use getName() method instead of name property
* Update documentation examples to use custom tokens

Replace predefined tokens with user-defined tokens. Update Registry interface to require getName() method instead of name property. Clean up imports throughout the codebase for better organization.

## [1.0.4](https://github.com/ElsiKora/ClaDI/compare/v1.0.3...v1.0.4) (2025-04-08)

### Bug Fixes

- **docs:** clean target directory before copying docs and fix tsdoc reference ([d0b32e8](https://github.com/ElsiKora/ClaDI/commit/d0b32e80b273367087bfe2fb675d3efdf93a6c8c))

## [1.0.3](https://github.com/ElsiKora/ClaDI/compare/v1.0.2...v1.0.3) (2025-04-08)

## [1.0.2](https://github.com/ElsiKora/ClaDI/compare/v1.0.1...v1.0.2) (2025-04-08)

## [1.0.1](https://github.com/ElsiKora/ClaDI/compare/v1.0.0...v1.0.1) (2025-04-07)

# 1.0.0 (2025-04-07)

### Bug Fixes

- **ci:** add kebab case repo name handling in docs mirroring workflow ([a1694b3](https://github.com/ElsiKora/ClaDI/commit/a1694b3f86b1def9461bd268eba65e4cceaac27e))
- **ci:** correct variable substitution in docs workflow and simplify index text ([6946f19](https://github.com/ElsiKora/ClaDI/commit/6946f1920e9748a57f974d68c02042b28ba1a81d))
- **ci:** replace underscore with hyphen in branch name generation ([1ddb6f6](https://github.com/ElsiKora/ClaDI/commit/1ddb6f62c8b007271ab4dcea121ca7b9d941041c))
- **workflows:** improve docs mirroring workflow with better kebab case naming ([be6adc1](https://github.com/ElsiKora/ClaDI/commit/be6adc1de42d60f24a36b83788f66b6f061da804))
