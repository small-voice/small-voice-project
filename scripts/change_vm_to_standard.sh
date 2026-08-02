#!/bin/bash
# プリエンプティブルVMから通常VMへの移行スクリプト
# ディスク（データ）と静的IPを維持したままVMを再作成します。

set -e

ZONE="asia-northeast1-c"
INSTANCE="small-voice-server"
IP_NAME="small-voice-ip"
GCLOUD="./google-cloud-sdk/bin/gcloud"

echo "1. VM削除時にディスクが消えないよう、ディスクの自動削除を無効化します..."
$GCLOUD compute instances set-disk-auto-delete $INSTANCE \
  --zone=$ZONE \
  --disk=$INSTANCE \
  --no-auto-delete

echo "2. 現在のプリエンプティブルのVMインスタンスを削除します（ディスクは残ります）..."
$GCLOUD compute instances delete $INSTANCE \
  --zone=$ZONE \
  --quiet

echo "3. まったく同じディスクとIPを使用して、通常VMとしてインスタンスを再作成します..."
$GCLOUD compute instances create $INSTANCE \
  --zone=$ZONE \
  --machine-type=e2-small \
  --disk=name=$INSTANCE,device-name=$INSTANCE,mode=rw,boot=yes \
  --address=$IP_NAME \
  --network-tier=STANDARD \
  --tags=http-server,https-server \
  --scopes=https://www.googleapis.com/auth/devstorage.read_only,https://www.googleapis.com/auth/logging.write,https://www.googleapis.com/auth/monitoring.write,https://www.googleapis.com/auth/service.management.readonly,https://www.googleapis.com/auth/servicecontrol,https://www.googleapis.com/auth/trace.append \
  --quiet

echo "4. 次回VM削除時にディスクも整理されるよう設定を戻します..."
$GCLOUD compute instances set-disk-auto-delete $INSTANCE \
  --zone=$ZONE \
  --disk=$INSTANCE \
  --auto-delete

echo "完了しました！サーバーは通常のVMとして起動中です（サービスが復旧するまで1分ほどかかります）。"
