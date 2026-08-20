
import json
import uuid

path = 'infrastructure/keycloak/teman-belajar-realm.json'
with open(path, 'r', encoding='utf-8') as f:
    realm = json.load(f)

# Check if already exists
exists = any(c.get('clientId') == 'teman-belajar-admin-management' for c in realm.get('clients', []))

if not exists:
    new_client = {
        'clientId': 'teman-belajar-admin-management',
        'name': 'Teman Belajar Admin Management',
        'enabled': True,
        'clientAuthenticatorType': 'client-secret',
        'secret': '',
        'redirectUris': [],
        'webOrigins': [],
        'notBefore': 0,
        'bearerOnly': False,
        'consentRequired': False,
        'standardFlowEnabled': False,
        'implicitFlowEnabled': False,
        'directAccessGrantsEnabled': False,
        'serviceAccountsEnabled': True,
        'publicClient': False,
        'frontchannelLogout': False,
        'protocol': 'openid-connect',
        'attributes': {
            'oidc.ciba.grant.enabled': 'false',
            'oauth2.device.authorization.grant.enabled': 'false',
            'client.secret.creation.time': '1692843485',
            'backchannel.logout.session.required': 'true',
            'backchannel.logout.revoke.offline.tokens': 'false'
        },
        'authenticationFlowBindingOverrides': {},
        'fullScopeAllowed': False,
        'nodeReRegistrationTimeout': -1,
        'defaultClientScopes': [
            'web-origins',
            'acr',
            'roles',
            'profile',
            'email'
        ],
        'optionalClientScopes': [
            'address',
            'phone',
            'offline_access',
            'microprofile-jwt'
        ]
    }
    realm['clients'].append(new_client)

    # We need to assign 'manage-users' role to this client's service account.
    # In Keycloak Realm JSON export, service account roles are typically mapped in 'users' array for service accounts
    # But wait, Keycloak handles service account creation automatically on import if serviceAccountsEnabled=true,
    # but the role mapping isn't created automatically.
    # We can handle this in econcile-sso-clients.sh!
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(realm, f, indent=4)
    print('Added client.')
else:
    print('Client already exists.')

