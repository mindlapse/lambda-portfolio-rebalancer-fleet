#!/usr/bin/env bash

if [ "$1" == "" ]; then
    echo "Usage: flow.sh <function name>"
    echo
    echo "Example: flow.sh em_prod_save_agent"
    echo
    exit 1
fi

account_id=`aws sts get-caller-identity --query "Account" --output text`

npm run build && \
    npm run login && \
    npm run push && \
    aws lambda update-function-code --function-name $1 --image-uri ${account_id}.dkr.ecr.ca-central-1.amazonaws.com/em_prod_core:prod --publish --query 'FunctionArn'
    
    
if [ $? -eq 0 ] 
then 
    status=""
    until [ "$status" == "\"Successful\"" ]
    do
        status=`aws lambda get-function --function-name $1 --query "Configuration.LastUpdateStatus"`
        echo $status
        sleep 1
    done
    echo "Deployed."

else
    echo "Failed."
fi