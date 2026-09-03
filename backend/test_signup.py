import urllib.request
import json
import urllib.error

url = 'http://127.0.0.1:8000/api/v1/auth/admin-signup/'
data = {
    "full_name": "dil",
    "email": "dilfarasheed55@gmail.com",
    "phone": "7356546748",
    "password": "enteredpassword",
    "confirm_password": "enteredpassword",
    "business_code": "dil123"
}

headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
}

req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')

try:
    with urllib.request.urlopen(req) as response:
        print("Success:", response.status)
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("Error:", e.code)
    print(e.read().decode('utf-8'))
