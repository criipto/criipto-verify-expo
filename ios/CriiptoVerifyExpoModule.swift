import ExpoModulesCore
import IduraVerify

private let INFO_PLIST_DOMAIN_KEY = "IDURA_DOMAIN"
private let INFO_PLIST_CLIENT_ID_KEY = "IDURA_CLIENT_ID"

internal struct LoginParams: Record {
  @Field var acrValues: String = ""
  @Field var scope: String?
  @Field var loginHint: String?
  @Field var prompt: String?
  @Field var action: String?
  @Field var preferEphemeralSession: Bool?
}

// Preflight failures (missing Info.plist keys, unknown prompt) ride across the
// bridge as `NativeLoginResult.ModuleNotConfigured` / `.UnknownPrompt` variants
// just like SDK outcomes — these lightweight Swift error types only exist as
// internal control flow, caught at the boundary in `performLogin`.
private struct ModuleNotConfiguredError: Error {
  let message: String
}

private struct UnknownPromptError: Error {
  let value: String
}

// Every outcome — SDK calls, preflight setup, input validation — is returned
// as a `NativeLoginResult` Record (see ios/__generated__/NativeLoginResult.swift,
// generated from src/NativeLoginResult.d.ts via `npm run generate-native-types`).
public class CriiptoVerifyExpoModule: Module {
  // `IduraVerify` is `@MainActor`-isolated, so the cache and every touch of it
  // has to live on the main actor. MainActor isolation also gives us free
  // serialization of the lazy-init check — no NSLock needed.
  @MainActor private var iduraVerify: IduraVerify?

  public func definition() -> ModuleDefinition {
    Name("CriiptoVerifyExpo")

    // Returns `[String: Any]` rather than `any Record`. The Expo bridge dispatches
    // return-value serialisation off the *static* return type: `~(any Record).self`
    // falls through to `DynamicRawType`, which returns the existential as-is and
    // never calls `Record.toDictionary()`. `[String: Any]` is dispatched through
    // `DynamicDictionaryType`, which serialises correctly. Each variant Record is
    // therefore converted to its dict here at the boundary.
    AsyncFunction("login") { (params: LoginParams) async -> [String: Any] in
      await self.performLogin(params)
    }
  }

  // Pinned to the main actor because `ensureSdk()` constructs an `IduraVerify`
  // (whose initializer is `@MainActor`-isolated) and the `sdk.login(...)` call
  // is itself `@MainActor`. Awaiting this method from the AsyncFunction body
  // hops us onto the main actor; the SDK's internal `await`s then suspend the
  // task — not the thread — so URLSession / AppAuth keep doing their I/O on
  // background queues.
  @MainActor
  private func performLogin(_ params: LoginParams) async -> [String: Any] {
    do {
      let sdk = try ensureSdk()
      let eid = buildEid(params)
      let prompt = try parsePrompt(params.prompt)
      let result = try await sdk.login(
        eid: eid,
        prompt: prompt,
        useEphemeralBrowserSession: params.preferEphemeralSession
      )
      return NativeLoginResult.Success(
        idToken: result.jwt.idToken,
        traceId: result.traceId
      ).toDictionary()
    } catch let iduraError as IduraVerifyError {
      switch iduraError {
      case .userCancelled(let traceId):
        return NativeLoginResult.UserCancelled(traceId: traceId).toDictionary()
      case .associatedDomainsNotConfigured:
        return NativeLoginResult.ModuleNotConfigured(
          message: iduraError.localizedDescription
        ).toDictionary()
      case .oauth(let oauthError, let oauthDescription, let traceId):
        return NativeLoginResult.OAuthError(
          error: oauthError,
          errorDescription: oauthDescription,
          traceId: traceId
        ).toDictionary()
      case .internalError(let message, _, let traceId):
        return NativeLoginResult.InternalError(message: message, traceId: traceId).toDictionary()
      }
    } catch let preflight as ModuleNotConfiguredError {
      return NativeLoginResult.ModuleNotConfigured(message: preflight.message).toDictionary()
    } catch let preflight as UnknownPromptError {
      return NativeLoginResult.UnknownPrompt(value: preflight.value).toDictionary()
    } catch {
      return NativeLoginResult.InternalError(message: error.localizedDescription).toDictionary()
    }
  }

  @MainActor
  private func ensureSdk() throws -> IduraVerify {
    if let iduraVerify { return iduraVerify }

    let info = Bundle.main.infoDictionary ?? [:]
    guard let domain = info[INFO_PLIST_DOMAIN_KEY] as? String, !domain.isEmpty else {
      throw ModuleNotConfiguredError(message: missingInfoPlistKeyMessage(INFO_PLIST_DOMAIN_KEY))
    }
    guard let clientId = info[INFO_PLIST_CLIENT_ID_KEY] as? String, !clientId.isEmpty else {
      throw ModuleNotConfiguredError(message: missingInfoPlistKeyMessage(INFO_PLIST_CLIENT_ID_KEY))
    }
    iduraVerify = IduraVerify(clientId: clientId, domain: domain)
    return iduraVerify!
  }

  private func missingInfoPlistKeyMessage(_ key: String) -> String {
    "Missing Info.plist key '\(key)' — configure the @criipto/verify-expo Expo plugin "
      + "with 'domain' and 'clientID' options, then run `expo prebuild`."
  }

  private func buildEid(_ params: LoginParams) -> Other {
    var eid = Other(acrValue: params.acrValues)
    if let scope = params.scope {
      for entry in scope.split(separator: " ") where !entry.isEmpty {
        eid = eid.withScope(String(entry))
      }
    }
    if let loginHint = params.loginHint {
      for entry in loginHint.split(separator: " ") where !entry.isEmpty {
        eid = eid.withLoginHint(String(entry))
      }
    }
    if let action = params.action {
      eid = eid.withLoginHint("action:\(action.lowercased())")
    }
    return eid
  }

  private func parsePrompt(_ value: String?) throws -> Prompt? {
    guard let value else { return nil }
    switch value.lowercased() {
    case "login": return .login
    case "none": return Prompt.none
    case "consent": return .consent
    case "consent_revoke": return .consentRevoke
    default: throw UnknownPromptError(value: value)
    }
  }
}
