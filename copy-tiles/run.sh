cat /src/copy-tiles.yaml | sed 's/\$PVC_ID/'"$PVC_ID"'/g' | sed 's/\$BUILD_ID/'"$BUILD_ID"'/g' | kubectl create -f -

until kubectl describe pod copy-tiles-$BUILD_ID | sed -n 's/Status:\s*//gp' | grep -m 1 "Succeeded"
do
    sleep 1
done

echo "file copied"

cat /src/copy-tiles.yaml | sed 's/\$PVC_ID/'"$PVC_ID"'/g' | sed 's/\$BUILD_ID/'"$BUILD_ID"'/g' | kubectl delete -f -