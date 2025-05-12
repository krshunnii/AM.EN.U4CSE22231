import requests

url = 'http://20.244.56.144/evaluation-service/register'
data = {
    "email": "AM.EN.U4CSE22231@AM.STUDENTS.AMRITA.EDU",
    "name": "K KRISHNANUNNI",
    "mobileNo": "9744053419",
    "githubUsername": "krshunnii",
    "rollNo": "AM.EN.U4CSE22231",
    "collegeName": "Amrita Vishwa Vidyapeetham",
    "accessCode": "SwuuKE"
}

response = requests.post(url, json=data)
print(response.json())