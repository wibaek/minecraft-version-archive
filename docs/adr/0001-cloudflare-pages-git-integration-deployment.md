# ADR 0001: Cloudflare Pages Git 연동으로 배포

날짜: 2026-06-09
상태: 승인됨

## 문제 상황

이 프로젝트는 `Astro`, `TypeScript`, `pnpm`으로 만든 정적 사이트다. 빌드 결과물은 `dist`에 생성되며, 서버 런타임이나 배포 시점 secret이 필요하지 않다. 배포 방식으로는 Cloudflare Pages의 GitHub 저장소 연동과 GitHub Actions에서 `Wrangler`로 직접 배포하는 방식이 모두 가능하다.

초기 배포에는 운영 복잡도를 낮추면서 push와 pull request에 대한 preview 배포를 쉽게 얻는 방식이 필요하다. 반면 GitHub Actions 직접 배포는 workflow, Cloudflare API token, account id secret, wrangler command를 직접 관리해야 하므로 현재 정적 사이트 범위에는 과한 설정이 될 수 있다.

## 결정

Cloudflare Pages 프로젝트를 GitHub 저장소와 직접 연결해 배포한다.

초기 설정은 다음 값을 사용한다.

- Production branch: `main`
- Build command: `pnpm build`
- Build output directory: `dist`

GitHub Actions는 초기 배포 경로로 사용하지 않는다. 추후 배포 전 검증을 더 강하게 통제해야 하면 GitHub Actions는 `pnpm test`, `pnpm check`, `pnpm lint`, `pnpm build`를 실행하는 검증 workflow로 먼저 추가하고, 배포는 Cloudflare Pages Git integration에 맡긴다.

## 근거

Cloudflare Pages의 Git integration은 branch push와 pull request에 대해 자동 build/deploy, preview URL, GitHub check run을 제공한다. 현재 프로젝트는 정적 Astro 사이트이고 별도 runtime binding이나 custom deploy step이 없으므로 Cloudflare Pages 기본 build pipeline에 잘 맞는다.

Cloudflare의 Astro Pages 가이드는 GitHub repository를 import한 뒤 build command와 build directory를 설정하는 흐름을 안내하며, Astro 정적 빌드 산출물은 `dist`를 사용한다. 이 프로젝트는 `pnpm`을 사용하므로 build command만 `pnpm build`로 둔다.

검토했지만 선택하지 않은 대안은 다음과 같다.

- GitHub Actions + `Wrangler` direct upload: 배포 조건과 secret 관리를 세밀하게 통제할 수 있지만, 현재는 Cloudflare API token과 workflow 유지보수 비용이 불필요하게 커진다.
- Cloudflare Pages Direct Upload 프로젝트: 로컬 또는 CI에서 prebuilt asset을 직접 올릴 수 있지만, Git 기반 자동 배포와 PR preview 중심 운영에는 덜 적합하다.

이 결정은 다음 가정을 전제로 한다.

- 배포 대상은 정적 Cloudflare Pages 사이트다.
- 배포 전 복잡한 custom build step이나 runtime secret이 없다.
- GitHub repository를 Cloudflare Pages GitHub App에 연결하는 것이 허용된다.
- Cloudflare Pages Git integration으로 만든 프로젝트는 Direct Upload 프로젝트로 전환할 수 없다는 제약을 감수한다.

## 결과

긍정적 결과는 다음과 같다.

- `main`에 push하면 Cloudflare Pages가 자동으로 build/deploy한다.
- pull request preview URL과 GitHub check run을 Cloudflare Pages가 제공한다.
- 별도 GitHub Actions 배포 secret을 만들지 않아도 된다.
- 현재 프로젝트의 정적 Astro 구조와 배포 설정이 단순하게 유지된다.

부정적 결과는 다음과 같다.

- Cloudflare Pages GitHub App에 repository access를 부여해야 한다.
- Git integration 프로젝트는 Direct Upload 프로젝트로 전환할 수 없다.
- 배포 pipeline의 세밀한 제어가 필요해지면 GitHub Actions 검증 workflow를 별도로 추가해야 한다.

## 참고

- Cloudflare Pages Git integration: https://developers.cloudflare.com/pages/configuration/git-integration/
- Cloudflare Pages GitHub integration: https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/
- Cloudflare Pages Astro guide: https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/
- Cloudflare Pages Direct Upload with CI: https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/
