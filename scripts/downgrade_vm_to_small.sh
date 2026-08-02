#!/bin/bash
# サーバーのスペックを e2-small（標準設定）に戻すスクリプト
# ※数分間のダウンタイムが発生します。

set -e

ZONE="asia-northeast1-c"
INSTANCE="small-voice-server"
GCLOUD="./google-cloud-sdk/bin/gcloud"

echo "1. サーバーを安全に停止しています..."
$GCLOUD compute instances stop $INSTANCE --zone=$ZONE --quiet

echo "2. スペックを e2-small (メモリ2GB) に変更しています..."
$GCLOUD compute instances set-machine-type $INSTANCE --zone=$ZONE --machine-type=e2-small

echo "3. サーバーを再起動しています..."
$GCLOUD compute instances start $INSTANCE --zone=$ZONE

echo "完了しました！e2-smallで稼働を再開しました（サービス復旧まで1分ほどお待ちください）。"
