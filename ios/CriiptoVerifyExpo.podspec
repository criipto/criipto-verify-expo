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
  s.platforms      = { :ios => '17.4' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/criipto/criipto-verify-expo.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,swift}'

  # The Idura Verify iOS SDK is distributed as a SwiftPM-only package — it has no
  # CocoaPods spec. `spm_dependency` is a global Ruby helper that React Native's
  # CocoaPods scripts (>= 0.75) inject; during `pod install`'s post-install phase
  # it registers an `XCRemoteSwiftPackageReference` on `Pods.xcodeproj` and links
  # the `IduraVerify` product to this pod target, so the module's Swift sources
  # can `import IduraVerify`. This pathway requires the consumer's app to opt into
  # `use_frameworks! :linkage => :dynamic` (set via the Expo plugin's check on
  # `expo-build-properties.ios.useFrameworks: "dynamic"`); static frameworks
  # produce duplicate-symbol errors.
  unless defined?(spm_dependency)
    raise '@criipto/verify-expo requires React Native >= 0.75 for SwiftPM support via spm_dependency. ' \
          'Bump react-native (Expo SDK 54 satisfies this).'
  end
  spm_dependency(s,
    url: 'https://github.com/criipto/idura-verify-ios',
    requirement: { kind: 'upToNextMajorVersion', minimumVersion: '2.0.0' },
    products: ['IduraVerify']
  )
end
