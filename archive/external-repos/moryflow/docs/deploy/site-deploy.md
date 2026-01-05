docker build --platform linux/amd64 -t moryflow-homepage -f Dockerfile .

docker tag moryflow-homepage dvlindev/moryflow-homepage
docker push dvlindev/moryflow-homepage


docker pull dvlindev/moryflow-homepage

docker run -d \
 -p 0.0.0.0:3210:3000 \
 --name moryflow-homepage \
 dvlindev/moryflow-homepage