require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'CriiptoVerifyExpo'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = {
    :ios => '17.4'
  }
  s.swift_version  = '5.10'
  s.source         = { git: 'https://github.com/criipto/criipto-verify-expo.git', tag: "v#{s.version}" }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # The Idura Verify iOS SDK is published only via Swift Package Manager. CocoaPods bridges
  # to it via `spm_dependency` (RN 0.75+ helper), which writes `XCRemoteSwiftPackageReference`
  # entries into the consumer's Pods.xcodeproj at `pod install` time. This requires the
  # consumer to enable `use_frameworks! :linkage => :dynamic` — the @criipto/verify-expo
  # config plugin enforces that via expo-build-properties.
  # NOTE: minimumVersion will need to be bumped to 1.0.1 before this branch is merged —
  # 1.0.1 is the iOS SDK release that ports the `supportsAppSwitch` data-driven app-switch
  # hint logic over from the Android SDK. Without it, our `Other(acrValue)` calls don't
  # trigger the MitID / FrejaID / SwedishBankID app-switch login hints. See PR on
  # criipto/idura-verify-ios.
  spm_dependency(s,
    url: 'https://github.com/criipto/idura-verify-ios',
    requirement: { kind: 'upToNextMajorVersion', minimumVersion: '1.0.0' },
    products: ['IduraVerify']
  )

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
