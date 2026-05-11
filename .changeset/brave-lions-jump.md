---
"cmdly": minor
---

feat: replace ncc packaging with Node SEA standalone binaries

Switched the build pipeline from `@vercel/ncc` to Node.js Single Executable Applications (SEA). Binaries are now produced for `linux-x64`, `linux-arm64`, and `darwin-arm64` targets (`darwin-x64` is excluded due to upstream instability). The release workflow uploads the resulting binaries and checksums as GitHub Release assets.

Also fixes Effect layer dependency ordering in the `configure`, `explain`, and `suggest` commands so that `NodeFileSystem` and `NodePath` layers are provided before dependent services, resolving TypeScript errors at runtime layer composition.
