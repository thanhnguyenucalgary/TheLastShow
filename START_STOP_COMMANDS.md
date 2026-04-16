# The Last Show - Runbook (Start, Deploy, Stop)

Quick, clean steps to run the app and fix common issues.

## 1) Set paths (once per terminal)

export PROJECT_ROOT=/Users/chithanhnguyen/Desktop/TheLastShow
export APP_ROOT=/Users/chithanhnguyen/Desktop/TheLastShow/thelastshow
export PEM=/Users/chithanhnguyen/Desktop/TheLastShow/thelastshow/the-last-show.pem
export EC2_USER=ec2-user
export EC2_HOST=35.183.24.39
export IMAGE=thanhnguyen0708/last-show-backend

## 2) Start frontend (local)

cd $APP_ROOT
npm install
npm run dev

Stop frontend: Ctrl + C

## 3) Start or restart backend (EC2 / K3s)

ssh -i "$PEM" "$EC2_USER@$EC2_HOST" "sudo k3s kubectl rollout restart deployment/last-show-backend && sudo k3s kubectl rollout status deployment/last-show-backend --timeout=180s"

Check pods:

ssh -i "$PEM" "$EC2_USER@$EC2_HOST" "sudo k3s kubectl get pods -l app=backend -o wide"

API test (hostPort mode):

curl -i "http://56.112.10.18:8000/get-obituaries?created_by=test@example.com"

## 4) Deploy new backend image

cd $PROJECT_ROOT
docker buildx build --platform linux/amd64 -t $IMAGE:amd64-v3 -f Dockerfile . --push

ssh -i "$PEM" "$EC2_USER@$EC2_HOST" "sudo k3s kubectl set image deployment/last-show-backend backend=$IMAGE:amd64-v3 && sudo k3s kubectl rollout status deployment/last-show-backend --timeout=240s"

Confirm image:

ssh -i "$PEM" "$EC2_USER@$EC2_HOST" "sudo k3s kubectl get deployment last-show-backend -o=jsonpath='{.spec.template.spec.containers[0].image}' && echo"

## 5) Stop backend (keep EC2 running)

ssh -i "$PEM" "$EC2_USER@$EC2_HOST" "sudo k3s kubectl scale deployment/last-show-backend --replicas=0"

Start it again:

ssh -i "$PEM" "$EC2_USER@$EC2_HOST" "sudo k3s kubectl scale deployment/last-show-backend --replicas=1 && sudo k3s kubectl rollout status deployment/last-show-backend --timeout=180s"

## 6) Stop EC2 (optional, cost saving)

aws ec2 stop-instances --region ca-central-1 --instance-ids i-0253b551f4b726531

Start EC2 again:

aws ec2 start-instances --region ca-central-1 --instance-ids i-0253b551f4b726531

## 7) Troubleshooting

### Check backend status

sudo k3s kubectl get pods -l app=backend -o wide

### Check backend logs

sudo k3s kubectl logs -l app=backend --tail=200

### Pending pod (hostPort conflict)

sudo k3s kubectl scale deployment/last-show-backend --replicas=1
sudo k3s kubectl delete pod -l app=backend

### Polly DNS error

- If logs show polly.ca-west-1.amazonaws.com resolution errors, use a Polly-supported region (ca-central-1 or us-east-1) and redeploy.

### SSM access errors

aws ssm get-parameter --name /last-show/google_api_key --with-decryption --region ca-west-1
aws ssm get-parameter --name /last-show/cloudinary_url --with-decryption --region ca-west-1
