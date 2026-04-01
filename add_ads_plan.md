# AdMob 보상형/전면 광고 추가 플랜

## Summary
현재 프로젝트는 단일 [`index.html`](/c:/Users/user/condition-runner/index.html) 중심의 `Capacitor 7` 게임이며, 광고 플러그인은 아직 없습니다. 플랜은 `iOS + Android` 기준으로 잡고, UX는 보수적으로 유지합니다: 보상형은 사용자가 직접 눌렀을 때만, 전면은 레벨 전환/재도전 같은 자연 전환 지점에서만 노출합니다.

## Key Changes
- 광고 SDK는 `@capacitor-community/admob` 기준으로 통합한다.
  - 웹 브라우저에서는 no-op 처리해 현재 `live-server` 개발 흐름을 깨지 않게 한다.
  - 앱 시작 시 `AdMob.initialize()` 후 consent/tracking 흐름을 처리하고, 광고 가능 상태를 내부 플래그로 관리한다.
- 광고 접근은 `index.html` 내부에 단일 `adService` 레이어로 감싼다.
  - 공개 인터페이스:
    - `initAds()`
    - `preloadInterstitial(reason)`
    - `showInterstitialIfEligible(reason): Promise<boolean>`
    - `showRewardedForRetryBoost(): Promise<boolean>`
    - `openPrivacyOptions(): Promise<void>`
    - `isNativeAdsAvailable(): boolean`
- 보상형 광고는 `retry-overlay`에 새 CTA를 추가한다.
  - 버튼 문구: `광고 보고 부스트 받고 재도전`
- 보상 내용: 다음 재시작 1회에 한해 `추가 생명 +1` 적용
  - 구현 방식: `pendingRewardBoost` 상태를 두고, 광고 보상 이벤트 수신 시만 세팅한 뒤 `startGame()` 진입 전에 소비한다
  - 일반 `retry-btn`과 보상형 재도전 버튼은 동시에 존재하지만, 보상형 경로에서는 전면 광고를 겹쳐 띄우지 않는다
- 전면 광고는 두 지점에만 연결한다.
  - `clear-next-btn`: 다음 레벨 진입 직전
  - `retry-btn`: 동일 레벨 재시작 직전
  - 제외 지점: 첫 시작 버튼, 레벨 선택 이동, 일시정지/재개, 미션 완료
  - 노출 규칙:
    - 네이티브 앱에서만
    - 광고 준비 완료 상태일 때만
    - 첫 플레이 세션에서는 미노출
    - `120초` 최소 간격
    - eligible transition 2회당 1회만 노출
  - 광고 종료/실패 후 즉시 다음 전면 광고를 preload 한다
- 설정/개인정보 흐름을 추가한다.
  - 현재 설정 시트에 `광고 개인정보 설정` 액션을 추가하고 `openPrivacyOptions()`에 연결
  - iOS에서는 ATT 설명 문자열과 consent 플로우를 포함한다
- 플랫폼 설정을 반영한다.
  - [`package.json`](/c:/Users/user/condition-runner/package.json): AdMob 플러그인 추가
  - Android: 현재 플랫폼 폴더가 없으므로 먼저 `npx cap add android` 전제로 계획한다
  - [`ios/App/App/Info.plist`](/c:/Users/user/condition-runner/ios/App/App/Info.plist): `GADApplicationIdentifier`, `NSUserTrackingUsageDescription`, Google Mobile Ads 요구 항목 추가
  - Android 생성 후 `AndroidManifest.xml` 및 `strings.xml`에 AdMob app id 반영
  - 실제 광고 단위 ID는 코드 상수로 분리:
    - `ADMOB_APP_ID_IOS`
    - `ADMOB_APP_ID_ANDROID`
    - `ADMOB_INTERSTITIAL_ID_IOS/ANDROID`
    - `ADMOB_REWARDED_ID_IOS/ANDROID`
    - 개발 중에는 테스트 ID 기본값 사용

## Public Interfaces / State Additions
- 런타임 상태 추가:
  - `adsReady`
  - `adsCanRequest`
  - `lastInterstitialAt`
  - `eligibleInterstitialTransitions`
  - `pendingRewardBoost`
  - `rewardBoostConsumedThisRun`
- UI 추가:
  - `retry-overlay` 내 보상형 CTA 1개
  - 설정 시트 내 개인정보 옵션 1개
- 저장 데이터는 기본적으로 무변경으로 간다.
  - 광고 빈도 제어는 세션 메모리 기준으로만 처리
  - 영구 저장이 필요해지면 2차로 `save` 스키마 확장

## Test Plan
- 웹 브라우저에서 게임 시작/클리어/재시도 시 오류 없이 기존 플레이가 유지된다
- 네이티브 앱에서 첫 실행 시 광고 초기화 실패가 있어도 게임 진행은 막히지 않는다
- 보상형 버튼 탭 후:
  - 광고 미로드 시 안전하게 fallback
  - 광고 시청 완료 시에만 `pendingRewardBoost`가 적용된다
  - 광고 중도 종료 시 보상 미지급
  - 보상형 재도전 시작 시 생명/슬로우가 계획값으로 반영된다
- 전면 광고는 `clear-next-btn`, `retry-btn` 경로에서만 시도된다
- 전면 광고는 120초 간격과 2회당 1회 빈도 제한을 지킨다
- 보상형 재도전 직후에는 전면 광고가 중첩되지 않는다
- iOS에서 ATT/consent 플로우 후 광고 요청 가능 여부가 정상 반영된다
- 설정 시트의 `광고 개인정보 설정`이 privacy options form으로 연결된다
- Android 플랫폼 생성 후 `cap sync` 기준으로 네이티브 설정 누락이 없는지 확인한다

## Assumptions
- 구현은 기존 단일 파일 구조를 유지하고, 별도 프런트엔드 빌드 체계는 추가하지 않는다
- 보상형 보상은 `즉시 부활`이 아니라 `다음 재시작 1회 부스트`로 고정한다
- 광고 대상은 `iOS + Android`이며, 현재 Android 폴더가 없으므로 플랫폼 생성 작업이 선행된다
- 광고 단위 ID는 실운영 값이 아직 없다고 보고, 개발 단계에서는 Google 테스트 ID로 먼저 연결한다
- 소스 기준으로 가장 안전한 삽입 지점은 현재 버튼 이벤트가 모여 있는 오버레이 흐름(`startGame`, `levelClear`, `retryBtn`, `clearNextBtn`)이다
