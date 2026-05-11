# cmdly

## 0.2.0

### Minor Changes

- [#8](https://github.com/Armadillidiid/cmdly/pull/8) [`833fe46`](https://github.com/Armadillidiid/cmdly/commit/833fe4672d2a1871a3c80bb2fdf55fca95ff9413) Thanks [@Armadillidiid](https://github.com/Armadillidiid)! - feat: replace ncc packaging with Node SEA standalone binaries

  Switched the build pipeline from `@vercel/ncc` to Node.js Single Executable Applications (SEA). Binaries are now produced for `linux-x64`, `linux-arm64`, and `darwin-arm64` targets (`darwin-x64` is excluded due to upstream instability). The release workflow uploads the resulting binaries and checksums as GitHub Release assets.

  Also fixes Effect layer dependency ordering in the `configure`, `explain`, and `suggest` commands so that `NodeFileSystem` and `NodePath` layers are provided before dependent services, resolving TypeScript errors at runtime layer composition.

## 0.1.0

### Minor Changes

- [`dd1a636`](https://github.com/Armadillidiid/cmdly/commit/dd1a63669d73ed37ed259820c861f958ba6e3a8d) Thanks [@Armadillidiid](https://github.com/Armadillidiid)! - docs: update README with video demo

## 0.0.1

### Patch Changes

- [`fa2e780`](https://github.com/Armadillidiid/cmdly/commit/fa2e780a3ca116740faf046271fb00283829f093) Thanks [@Armadillidiid](https://github.com/Armadillidiid)! - Change default provider from `github-models` to `github-copilot`

- [`f53f9cb`](https://github.com/Armadillidiid/cmdly/commit/f53f9cbc4afa5c7b3c05b9f14516b15380b65500) Thanks [@Armadillidiid](https://github.com/Armadillidiid)! - Upgrade npm version in release workflow to support trusted publishing (OIDC)

- [`fa2e780`](https://github.com/Armadillidiid/cmdly/commit/fa2e780a3ca116740faf046271fb00283829f093) Thanks [@Armadillidiid](https://github.com/Armadillidiid)! - Improve credentials file security by writing with strict permissions (0600).
