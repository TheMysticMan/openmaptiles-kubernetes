#Check if service is created. Otherwise we'll create it
echo "check if tileserver service exists."
DELETE_EXISTING=false
if kubectl get service tileserver; 
then
    echo "tileserver service already exists."
    DELETE_EXISTING=true
else
    echo "tileserver service doesn't exist. Creating it now."
    cat /src/tileserver/service.yaml |  sed 's/\$VERSION/'"$BUILD_ID"'/g' | kubectl create -f -
fi

export BlueVersion=$(kubectl get service tileserver -o=jsonpath='{.spec.selector.version}') #find deployed version
cat /src/tileserver/tileserver.yaml | sed 's/\$VERSION/'"$BUILD_ID"'/g' | kubectl create -f - #Deploy new version
kubectl rollout status deployment/tileserver-$BUILD_ID-deployment #Health Check
kubectl get service tileserver -o=yaml | sed -e "s/$BlueVersion/$BUILD_ID/g" | kubectl apply -f - #Update Service YAML with Green version

if $DELETE_EXISTING
then
    kubectl delete deployment tileserver-$BlueVersion-deployment #Delete blue version
fi