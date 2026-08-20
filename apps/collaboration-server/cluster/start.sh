#!/bin/bash
set -e

INSTANCE_COUNT="${1:-2}"

BASE_PORT=1235
MONITOR_URL="http://localhost:9090"
MONGO_URI="mongodb://localhost:27017/docuflow"
MONGO_COLLECTION="docuFlow-document"
REDIS_URI="redis://localhost:6379"
INTERNAL_TOKEN="vervedocs-internal"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$PROJECT_DIR/dist"
NM_DIR="$PROJECT_DIR/node_modules"

echo "============================================"
echo " VerveDocs Collaboration Server Cluster"
echo " Instances: $INSTANCE_COUNT"
echo " Base Port : $BASE_PORT"
echo "============================================"
echo

echo "Step 1/3: Building..."
cd "$PROJECT_DIR"
npm run build
echo "Build done."
echo

echo "Step 2/3: Preparing instance dirs..."
for i in $(seq 1 "$INSTANCE_COUNT"); do
    SDIR="$SCRIPT_DIR/server$i"
    mkdir -p "$SDIR/dist"
    cp -r "$DIST_DIR"/* "$SDIR/dist/"
    cp "$PROJECT_DIR/package.json" "$SDIR/"
    if [ ! -e "$SDIR/node_modules" ]; then
        ln -s "$NM_DIR" "$SDIR/node_modules"
    fi
    PORT=$((BASE_PORT + i - 1))
    cat > "$SDIR/.env" <<EOF
PORT=$PORT
MONGO_URI=$MONGO_URI
MONGO_COLLECTION=$MONGO_COLLECTION
REDIS_URI=$REDIS_URI
MONITOR_URL=$MONITOR_URL
INSTANCE_URL=http://localhost:$PORT
INTERNAL_TOKEN=$INTERNAL_TOKEN
EOF
    echo "  server$i port=$PORT"
done
echo

echo "Step 3/3: Starting instances..."
for i in $(seq 1 "$INSTANCE_COUNT"); do
    SDIR="$SCRIPT_DIR/server$i"
    PORT=$((BASE_PORT + i - 1))
    cd "$SDIR"
    nohup node dist/index.js > "$SDIR/server.log" 2>&1 &
    echo $! > "$SDIR/server.pid"
    echo "  started server$i on port $PORT (pid $!)"
done
echo

END_PORT=$((BASE_PORT + INSTANCE_COUNT - 1))
echo "============================================"
echo " All instances started!"
echo " Ports: $BASE_PORT - $END_PORT"
echo " Stop:  cluster/stop.sh"
echo "============================================"