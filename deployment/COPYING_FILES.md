# Copying files to server (examples)

# Backend (to /opt/ax-backend)

rsync -av --delete --exclude node_modules --exclude dist \
 backend/ user@server:/opt/ax-backend/

# Frontend source (optional, if building on server)

rsync -av --delete --exclude node_modules \
 frontend/ user@server:/opt/ax-frontend-src/

# Frontend build (if building locally)

# After running npm run build in frontend/

rsync -av --delete frontend/build/ user@server:/var/www/ax-frontend/

# Install service and nginx on server

sudo cp deployment/systemd/backend.service /etc/systemd/system/ax-backend.service
sudo systemctl daemon-reload
sudo systemctl enable --now ax-backend.service

sudo cp deployment/nginx/ax-frontend.conf /etc/nginx/sites-available/ax-frontend.conf
sudo ln -sf /etc/nginx/sites-available/ax-frontend.conf /etc/nginx/sites-enabled/ax-frontend.conf
sudo nginx -t && sudo systemctl reload nginx
