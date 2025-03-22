class NotificationSystem {
    constructor() {
        this.container = document.getElementById('notifications');
    }

    show(message, type = 'success', duration = 5000) {
        const id = Date.now();
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.id = `notification-${id}`;
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            info: 'info-circle',
            warning: 'exclamation-triangle',
            loading: 'spinner fa-spin'
        };
        
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${icons[type]}"></i>
            </div>
            <div class="notification-content">${message}</div>
            ${type !== 'loading' ? `
                <button class="notification-close" onclick="notifications.dismiss(${id})">
                    <i class="fas fa-times"></i>
                </button>
            ` : ''}
        `;
        
        this.container.appendChild(notification);
        
        if (type !== 'loading' && duration) {
            setTimeout(() => this.dismiss(id), duration);
        }

        return id;
    }

    dismiss(id) {
        const notification = document.getElementById(`notification-${id}`);
        if (!notification) return;
        
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => notification?.remove(), 300);
    }

    // Helper methods for different types
    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 7000) {
        return this.show(message, 'error', duration);
    }

    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }

    warning(message, duration = 6000) {
        return this.show(message, 'warning', duration);
    }

    loading(message) {
        return this.show(message, 'loading', 0);
    }

    // Update a loading notification to a final state
    updateLoading(id, message, type = 'success') {
        this.dismiss(id);
        return this.show(message, type);
    }
}

// Create global instance
const notifications = new NotificationSystem();
