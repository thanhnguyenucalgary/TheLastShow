# The Last Show - Start, Restart, Stop Commands

This guide includes all commands to run the app, restart it, and turn it off.

## 1) Paths and Variables

Use these values exactly:

export PROJECT_ROOT=/Users/chithanhnguyen/Desktop/TheLastShow
export APP_ROOT=/Users/chithanhnguyen/Desktop/TheLastShow/thelastshow
export PEM=/Users/chithanhnguyen/Desktop/TheLastShow/thelastshow/the-last-show.pem
export EC2_USER=ec2-user
export EC2_HOST=35.183.24.39
export IMAGE=thanhnguyen0708/last-show-backend

## 2) Start Frontend Locally

cd $APP_ROOT
npm install
npm run dev

Frontend will run on your local machine (usually http://localhost:5173).

To stop local frontend:

- Press Ctrl + C in that terminal.

## 3) Start Backend On EC2 (K3s)

If backend already exists in K3s, restart it:

ssh -i "$PEM" "$EC2_USER@$EC2_HOST" "sudo k3s kubectl rollout restart deployment/last-show-backend && sudo k3s kubectl rollout status deployment/last-show-backend --timeout=180s"

No-variable version:

ssh -i /Users/chithanhnguyen/Desktop/TheLastShow/thelastshow/the-last-show.pem ec2-user@35.183.24.39 "sudo k3s kubectl rollout restart deployment/last-show-backend && sudo k3s kubectl rollout status deployment/last-show-backend --timeout=180s"

Check pods:

ssh -i "$PEM" "$EC2_USER@$EC2_HOST" "sudo k3s kubectl get pods -l app=backend -o wide"

Public API test:

curl -i "http://35.183.24.39:30791/get-obituaries?created_by=test@example.com"

## 4) Deploy New Backend Code (Build + Push + Rollout)

Run from PROJECT_ROOT:

cd $PROJECT_ROOT
docker buildx build --platform linux/amd64 -t $IMAGE:amd64-v11 -f Dockerfile . --push

Then update deployment image and wait:

ssh -i "$PEM" "$EC2_USER@$EC2_HOST" "sudo k3s kubectl set image deployment/last-show-backend backend=$IMAGE:amd64-v11 && sudo k3s kubectl rollout status deployment/last-show-backend --timeout=240s"

Confirm deployed image:

ssh -i "$PEM" "$EC2_USER@$EC2_HOST" "sudo k3s kubectl get deployment last-show-backend -o=jsonpath='{.spec.template.spec.containers[0].image}' && echo"

## 5) Restart Application

### Restart backend only

ssh -i "$PEM" "$EC2_USER@$EC2_HOST" "sudo k3s kubectl rollout restart deployment/last-show-backend && sudo k3s kubectl rollout status deployment/last-show-backend --timeout=180s"

### Restart frontend only

- Stop frontend terminal with Ctrl + C
- Start again:

cd $APP_ROOT
npm run dev

## 6) Turn Off Application

### Turn off backend app (keep EC2 running)

ssh -i "$PEM" "$EC2_USER@$EC2_HOST" "sudo k3s kubectl scale deployment/last-show-backend --replicas=0 && sudo k3s kubectl get deployment last-show-backend"

### Turn backend back on

ssh -i "$PEM" "$EC2_USER@$EC2_HOST" "sudo k3s kubectl scale deployment/last-show-backend --replicas=1 && sudo k3s kubectl rollout status deployment/last-show-backend --timeout=180s"

### Turn off frontend local app

- Press Ctrl + C in frontend terminal.

## 7) Optional: Turn Off Entire EC2 Server (Cost Saving)

Stop instance:

aws ec2 stop-instances --region ca-central-1 --instance-ids i-0253b551f4b726531

Start instance later:

aws ec2 start-instances --region ca-central-1 --instance-ids i-0253b551f4b726531

After start, wait until status checks pass:

aws ec2 describe-instance-status --region ca-central-1 --instance-ids i-0253b551f4b726531 --include-all-instances

Then run backend restart command from section 3.

## 8) Common Mistakes

- Do not use a relative PEM path unless you are in the same folder as the key.
- Keep all remote K3s commands inside one ssh "..." command, otherwise they run on your Mac.
- Build backend image for linux/amd64 to match EC2 architecture.
