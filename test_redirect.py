
import requests
def check_redirect(url):
    try:
        r = requests.get(url, allow_redirects=False)
        if r.status_code in [301, 302, 303, 307, 308]:
            loc = r.headers.get('Location', '')
            print(f'[OK] {url} -> {loc[:100]}...')
        else:
            print(f'[FAIL] {url} returned {r.status_code}')
    except Exception as e:
        print(f'[ERROR] {url} failed: {e}')

check_redirect('http://localhost:3000/api/auth/signin/keycloak')
check_redirect('http://localhost:3001/api/auth/signin/keycloak')
check_redirect('http://localhost:8082/auth/oauth2/login.php?id=1&wantsurl=%2F')
check_redirect('http://localhost:3001/api/auth/federated-logout')
check_redirect('http://localhost:3000/api/auth/federated-logout')

