# Minecraft Java Edition Release Archive System Design

## Summary

이 문서는 `01-java-edition-release-archive-design.md`의 제품 기획을 구현 가능한 정적 사이트 시스템으로 나눈다. 대상은 Minecraft Java Edition 정식 릴리즈만 다루는 단일 페이지 아카이브다.

추천 아키텍처는 Astro 기반 정적 사이트 생성이다. 사이트는 빌드 시점에 로컬 release data를 읽고 정적 HTML, CSS, 최소 JavaScript로 출력한다. 서버 런타임, 외부 API 호출, 데이터 수집 파이프라인은 초기 시스템에 포함하지 않는다.

## Goals

- 단일 정적 페이지로 Java Edition 정식 릴리즈 아카이브를 렌더링한다.
- 메이저 버전 중심 섹션과 마이너 릴리즈 목록을 명확한 컴포넌트 경계로 나눈다.
- 오른쪽 메이저 버전 TOC는 anchor navigation만으로도 동작하게 한다.
- 현재 섹션 강조 같은 보조 동작은 progressive enhancement로 제한한다.
- 하드코딩 데이터라도 타입과 구조를 통해 유지보수 가능하게 만든다.
- 정적 호스팅 환경에 배포 가능한 산출물을 만든다.

## Non-Goals

- 백엔드 서버를 만들지 않는다.
- 외부 API, 크롤러, scheduled job을 만들지 않는다.
- 검색, 복합 필터, 정렬 변경, 상세 페이지 라우팅을 만들지 않는다.
- snapshot, pre-release, release candidate, Bedrock Edition 데이터를 다루지 않는다.
- 초기 구현에서 CMS나 데이터베이스를 도입하지 않는다.

## Architecture Decision

### Recommended: Astro Static Site

Astro를 사용해 `index.html` 중심의 정적 사이트를 생성한다. 페이지는 Astro component로 나누고, release data는 TypeScript module로 관리한다. 상호작용은 anchor link, CSS sticky, 필요 시 작은 client script에 한정한다.

장점:

- 콘텐츠 중심 정적 사이트에 적합하다.
- 기본 산출물이 HTML이라 검색 엔진과 접근성에 유리하다.
- React SPA보다 기본 JavaScript 비용이 낮다.
- 컴포넌트 단위 분해와 TypeScript data model을 함께 사용할 수 있다.
- 나중에 검색이나 필터가 필요할 때 일부 island만 추가하기 쉽다.

단점:

- 완전한 React app에 비해 클라이언트 상태 관리 패턴은 덜 중심적이다.
- 팀이 Astro에 익숙하지 않다면 초기 문법 학습이 필요하다.

### Alternative: Vite React SPA

React와 Vite로 단일 페이지 앱을 만들 수 있다. 컴포넌트 모델은 익숙하지만, 이 사이트는 라우팅과 클라이언트 상태가 거의 없으므로 초기 범위에는 과하다.

### Alternative: Plain HTML, CSS, JavaScript

가장 단순한 정적 파일 구조도 가능하다. 다만 release data가 커질수록 HTML 안에 반복 markup이 많아지고, 데이터 구조 검증과 컴포넌트 재사용이 약해진다.

## System Overview

```text
src/data/release-data.ts
  -> src/pages/index.astro
  -> src/components/*
  -> static HTML/CSS/JS
  -> static hosting
```

시스템은 빌드 시점에 모든 release data를 읽는다. 페이지 렌더링은 data module을 순회해 최신순 메이저 버전 섹션과 마이너 릴리즈 항목을 만든다.

브라우저 런타임에서 필요한 핵심 기능은 없다. TOC anchor link는 HTML만으로 동작한다. 현재 섹션 강조는 IntersectionObserver를 사용하는 작은 client script로 추가할 수 있지만, 해당 script가 실패해도 페이지 탐색은 유지된다.

## Source Layout

초기 파일 구조는 다음을 기준으로 한다.

```text
src/
  components/
    AppHeader.astro
    LatestReleaseHighlight.astro
    MajorReleaseSection.astro
    MinorReleaseItem.astro
    ReleaseArchive.astro
    ReleaseToc.astro
  data/
    release-data.ts
    release-types.ts
  pages/
    index.astro
  styles/
    global.css
    tokens.css
```

### pages/index.astro

페이지 조립 책임만 가진다. data를 가져오고, layout과 section component에 전달한다.

책임:

- release data import
- latest release 계산 또는 전달
- header, highlight, archive, TOC 조립
- page metadata 설정

### data/release-types.ts

release data의 타입을 정의한다. 문자열 기반 데이터라도 타입 경계를 둬서 필수 필드 누락을 줄인다.

```ts
export type ReleaseLabel = "major" | "content" | "fix" | "technical" | "security";

export type MinorRelease = {
  version: string;
  releasedAt: string;
  label: ReleaseLabel;
  summary: string;
  changes: string[];
};

export type MajorRelease = {
  version: string;
  name: string;
  releasedAt: string;
  summary: string;
  highlights: string[];
  releases: MinorRelease[];
};
```

### data/release-data.ts

하드코딩된 release data를 보관한다. 데이터는 최신 메이저 버전부터 정렬한다. 각 메이저 버전 내부의 마이너 릴리즈도 최신순으로 정렬한다.

책임:

- `MajorRelease[]` export
- 정식 릴리즈만 포함
- 메이저 버전과 마이너 릴리즈 구조 분리
- 화면 텍스트에 바로 사용할 수 있는 summary와 changes 포함

### components/ReleaseArchive.astro

중앙 본문 전체를 렌더링한다.

책임:

- 메이저 버전 목록 순회
- 각 section의 anchor id 생성
- `MajorReleaseSection`에 data 전달

### components/MajorReleaseSection.astro

메이저 버전 한 섹션을 렌더링한다.

책임:

- 메이저 버전 heading
- 업데이트 이름과 대표 날짜 표시
- highlights 표시
- 마이너 릴리즈 목록 렌더링

### components/MinorReleaseItem.astro

정식 마이너 릴리즈 하나를 렌더링한다.

책임:

- 버전 번호
- 릴리즈 날짜
- release label
- summary
- 핵심 변경점 목록

### components/ReleaseToc.astro

데스크톱 오른쪽 TOC와 모바일 목차의 공통 source를 렌더링한다. 마이너 릴리즈는 TOC에 넣지 않는다.

책임:

- 메이저 버전 anchor link 목록
- 현재 섹션 강조용 `data-section-id`
- 모바일에서 접히는 목차 또는 가로 selector로 표현 가능한 markup 제공

## Data Flow

1. `release-data.ts`가 정렬된 `MajorRelease[]`를 export한다.
2. `index.astro`가 release data를 import한다.
3. `index.astro`는 첫 번째 메이저 버전과 첫 번째 마이너 릴리즈를 latest highlight에 전달한다.
4. `ReleaseArchive`는 전체 release data를 받아 메이저 버전 섹션을 렌더링한다.
5. `ReleaseToc`는 같은 release data에서 메이저 버전 목록만 추출해 anchor link를 렌더링한다.
6. 빌드 결과는 정적 HTML/CSS/JS로 출력된다.

## Anchor and TOC Design

Anchor id는 version 문자열에서 생성한다.

예시:

```text
1.21 -> version-1-21
1.20 -> version-1-20
```

규칙:

- 같은 메이저 버전 anchor가 중복되면 안 된다.
- TOC는 메이저 버전만 포함한다.
- TOC link는 `href="#version-1-21"` 같은 실제 anchor를 사용한다.
- 현재 섹션 강조가 없어도 모든 이동은 동작해야 한다.

현재 섹션 강조는 선택적 client script로 처리한다.

동작:

- IntersectionObserver로 현재 보이는 section을 감지한다.
- 대응하는 TOC link에 active state를 부여한다.
- script가 실패하면 active state만 사라지고 navigation은 유지된다.

## Styling System

스타일은 `tokens.css`와 `global.css`로 시작한다. 컴포넌트별 CSS는 Astro component 내부에 둘 수 있지만, 공통 색상과 spacing 값은 token으로 둔다.

초기 token:

- color: background, surface, text, muted text, accent, border
- spacing: section gap, item gap, page padding
- typography: body, section heading, version heading, metadata
- layout: content max width, TOC width, sticky top offset

디자인은 Minecraft의 소재감을 참고하되, UI 전체를 block texture로 덮지 않는다. 정보 계층이 우선이고 장식은 section 구분과 accent 정도로 제한한다.

## Responsive Layout

Desktop:

- CSS Grid로 main content와 right TOC를 배치한다.
- TOC는 `position: sticky`로 유지한다.
- 본문 폭을 우선하고 TOC는 보조 폭으로 제한한다.

Tablet:

- TOC 폭을 줄이거나 본문 상단으로 이동한다.
- 메이저 버전 섹션과 마이너 릴리즈 목록은 1열을 유지한다.

Mobile:

- 단일 컬럼으로 전환한다.
- TOC는 접이식 목차 또는 가로 selector로 전환한다.
- 긴 버전명, 날짜, summary가 줄바꿈되어도 item 높이만 늘어나고 가로 overflow가 생기지 않아야 한다.

## Accessibility Design

- 페이지는 `h1`, `h2`, `h3` heading hierarchy를 지킨다.
- TOC는 `nav`와 anchor link로 구성한다.
- 현재 섹션은 색상 외에도 border, indicator, `aria-current` 중 하나 이상으로 표시한다.
- 모바일 목차가 접이식이면 native `details` 또는 keyboard accessible button을 사용한다.
- 날짜와 버전 번호는 이미지나 icon에 의존하지 않고 텍스트로 제공한다.

## Error Handling and Data Validation

초기 시스템은 사용자 입력을 받지 않으므로 런타임 error handling은 최소화한다. 대신 authoring 단계에서 잘못된 data를 빨리 발견하는 쪽을 우선한다.

검증 대상:

- `version`이 비어 있지 않다.
- `releasedAt`이 비어 있지 않다.
- 메이저 버전 anchor id가 중복되지 않는다.
- 각 메이저 버전은 최소 1개 이상의 마이너 릴리즈를 가진다.
- `label`은 허용된 release label만 사용한다.

구현 시에는 작은 validation utility나 테스트로 확인한다. build가 통과해도 화면이 비어 있는 상태를 정상으로 취급하지 않는다.

## Build and Deployment

빌드 산출물은 정적 파일이다.

예상 명령:

```bash
pnpm build
```

배포 대상:

- GitHub Pages
- Cloudflare Pages
- Vercel static output
- Netlify

초기 시스템은 hosting provider에 종속되지 않는다. 배포 설정 파일은 provider가 정해진 뒤 추가한다.

## Testing Strategy

초기 테스트는 데이터 구조와 정적 렌더링 기준에 집중한다.

검증 항목:

- release data가 비어 있지 않다.
- 메이저 버전 anchor id가 중복되지 않는다.
- TOC에 마이너 릴리즈가 포함되지 않는다.
- 최신 메이저 버전이 첫 번째로 렌더링된다.
- 각 메이저 버전 내부의 마이너 릴리즈가 최신순이다.
- 모바일 폭에서 TOC가 본문을 덮지 않는다.

구현 단계에서 가능한 명령:

```bash
pnpm lint
pnpm build
pnpm test
```

프로젝트에 테스트 러너를 추가하지 않는 MVP라면 최소 기준은 `pnpm build`와 수동 viewport 확인이다.

## Implementation Boundaries

구현은 다음 순서로 분리하는 것이 좋다.

1. Astro + TypeScript + pnpm 기반 정적 사이트 골격
2. release data type과 sample data
3. 중앙 archive component
4. right-side TOC와 anchor navigation
5. responsive layout과 visual polish
6. data validation 또는 최소 테스트

이 문서는 구현 계획이 아니므로 각 작업의 상세 step은 별도 plan 문서에서 다룬다.

## Open Decisions

- 실제 포함할 Minecraft Java Edition 정식 릴리즈의 시작 버전
- 배포 대상 provider
- 검색 기능을 별도 phase로 추가할지 여부
- 대표 이미지나 item texture asset을 사용할지 여부
- 현재 섹션 강조를 JavaScript 없이 생략할지, IntersectionObserver로 추가할지 여부
