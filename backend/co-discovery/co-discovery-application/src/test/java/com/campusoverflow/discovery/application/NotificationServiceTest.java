package com.campusoverflow.discovery.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.campusoverflow.discovery.domain.notification.Notification;
import com.campusoverflow.discovery.domain.notification.NotificationRepository;
import com.campusoverflow.discovery.domain.notification.NotificationType;
import com.campusoverflow.shared.domain.NotFoundException;
import com.campusoverflow.shared.page.PageRequest;
import com.campusoverflow.shared.page.PageResult;
import com.campusoverflow.shared.security.Actor;
import com.campusoverflow.shared.security.Role;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepository notifications;
    private NotificationService service;

    private static final long USER_ID = 42L;
    private static final Actor SELF = new Actor(USER_ID, "小明", Role.STUDENT);

    @BeforeEach
    void setUp() {
        service = new NotificationService(notifications);
    }

    @Test
    @DisplayName("list：返回当前用户通知列表")
    void listReturnsNotifications() {
        Notification n = Notification.reconstitute(1L, USER_ID, NotificationType.ANSWER_ACCEPTED,
                "你的回答被采纳", "/questions/1", "evt-1", false, Instant.now());
        when(notifications.findByRecipient(USER_ID, new PageRequest(1, 20)))
                .thenReturn(new PageResult<>(List.of(n), 1, 1, 20));

        PageResult<NotificationView> result = service.list(SELF, new PageRequest(1, 20));
        assertThat(result.items()).hasSize(1);
        assertThat(result.items().get(0).title()).isEqualTo("你的回答被采纳");
        assertThat(result.items().get(0).read()).isFalse();
    }

    @Test
    @DisplayName("unreadCount：返回未读数")
    void unreadCountReturnsCount() {
        when(notifications.countUnread(USER_ID)).thenReturn(3L);
        assertThat(service.unreadCount(SELF)).isEqualTo(3L);
    }

    @Test
    @DisplayName("markRead：标记通知已读")
    void markReadMarksAsRead() {
        Notification n = Notification.reconstitute(1L, USER_ID, NotificationType.MENTIONED,
                "提到了你", "/questions/1", "evt-1", false, Instant.now());
        when(notifications.findById(1L)).thenReturn(Optional.of(n));

        service.markRead(SELF, 1L);
        assertThat(n.read()).isTrue();
    }

    @Test
    @DisplayName("markRead：通知不存在抛 404")
    void markReadNotFound() {
        when(notifications.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.markRead(SELF, 99L))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("markAllRead：批量标记已读")
    void markAllReadReturnsCount() {
        when(notifications.markAllRead(USER_ID)).thenReturn(5);
        assertThat(service.markAllRead(SELF)).isEqualTo(5);
    }
}
