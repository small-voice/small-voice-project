# 実装計画 - 政策機能の改善と権限修正

## 1. UI表示の重複修正
### 現状
「新規立案」ボタンを押すと、リストの上部と下部の2箇所にフォームが表示される。
### 解決策
下部の重複したフォームコードを削除し、上部のみに集約する。

## 2. 権限エラーの修正（メンバーの操作許可）
### 現状
バックエンドのポリシー管理エンドポイント（POST/PUT/DELETE）において、管理者（admin/org_admin）のみを許可するチェックが入っていたため、一般メンバーが操作しようとすると「Permission Denied (403)」エラーが発生する。
### 解決策
管理者のみに制限していた `is_admin` チェックを削除する。
ただし、所属組織のチェック（`organization_id == current_user.current_org_id`）は維持し、他の組織のデータを操作できないセキュリティは保つ。

## 修正対象ファイル
- `frontend/src/app/dashboard/sessions/[id]/page.tsx`
- `backend/api/dashboard.py`
