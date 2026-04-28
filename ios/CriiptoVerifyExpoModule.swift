import ExpoModulesCore
import IduraVerify

private let INFO_PLIST_DOMAIN = "IDURA_DOMAIN"
private let INFO_PLIST_CLIENT_ID = "IDURA_CLIENT_ID"

final class LoginParams: Record {
  @Field var acrValues: String = ""
  @Field var scope: String? = nil
  @Field var loginHint: String? = nil
  @Field var prompt: String? = nil
}

internal class ModuleNotConfiguredException: Exception {
  override var reason: String {
    "IduraVerify was never initialised — make sure @criipto/verify-expo is listed in app.json plugins with `domain` and `clientID` set, then run `expo prebuild`."
  }
}

internal class MissingInfoPlistKeyException: GenericException<String> {
  override var reason: String {
    "Missing Info.plist key '\(param)' — configure the @criipto/verify-expo Expo plugin with 'domain' and 'clientID' options, then run `expo prebuild`."
  }
}

internal class UnknownPromptException: GenericException<String> {
  override var reason: String {
    "Unknown prompt value: '\(param)'"
  }
}

public class CriiptoVerifyExpoModule: Module {
  /// Holds either the constructed `IduraVerify` instance or the failure captured during
  /// Info.plist lookup, so that a missing-config error surfaces at first `login()` call as
  /// a coded JS exception rather than crashing the module init.
  private var iduraVerifyResult: Result<IduraVerify, Error>?

  public func definition() -> ModuleDefinition {
    Name("CriiptoVerifyExpo")

    OnCreate {
      self.iduraVerifyResult = Result {
        guard let domain = Bundle.main.object(forInfoDictionaryKey: INFO_PLIST_DOMAIN) as? String else {
          throw MissingInfoPlistKeyException(INFO_PLIST_DOMAIN)
        }
        guard let clientID = Bundle.main.object(forInfoDictionaryKey: INFO_PLIST_CLIENT_ID) as? String else {
          throw MissingInfoPlistKeyException(INFO_PLIST_CLIENT_ID)
        }
        return IduraVerify(clientId: clientID, domain: domain)
      }
    }

    AsyncFunction("login") { (params: LoginParams) async throws -> [String: String] in
      guard let result = self.iduraVerifyResult else {
        throw ModuleNotConfiguredException()
      }
      let sdk = try result.get()

      let eid = buildEid(from: params)
      let prompt = try params.prompt.map(parsePrompt)
      let (idToken, _) = try await sdk.login(eid: eid, prompt: prompt)
      return ["id_token": idToken]
    }
  }
}

private func buildEid(from params: LoginParams) -> Other {
  var eid = Other(acrValue: params.acrValues)
  if let scope = params.scope {
    for token in scope.split(separator: " ", omittingEmptySubsequences: true) {
      eid = eid.withScope(String(token))
    }
  }
  if let loginHint = params.loginHint {
    for token in loginHint.split(separator: " ", omittingEmptySubsequences: true) {
      eid = eid.withLoginHint(String(token))
    }
  }
  return eid
}

private func parsePrompt(_ value: String) throws -> Prompt {
  switch value.lowercased() {
  case "login": return .login
  case "none": return .none
  case "consent": return .consent
  case "consent_revoke": return .consentRevoke
  default: throw UnknownPromptException(value)
  }
}
