package com.campusoverflow.discovery.application;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campusoverflow.discovery.domain.notification.Notification;
import com.campusoverflow.discovery.domain.notification.NotificationRepository;
import com.campusoverflow.identity.api.IdentityApi;
import com.campusoverflow.identity.api.UserSummary;
import com.campusoverflow.qa.api.QaQueryApi;
import com.campusoverflow.qa.api.QuestionRef;
import com.campusoverflow.qa.api.event.AnswerAcceptedEvent;
import com.campusoverflow.qa.api.event.AnswerSubmittedEvent;
import com.campusoverflow.qa.api.event.CommentPostedEvent;
import com.campusoverflow.reputation.api.event.BadgeAwardedEvent;
import com.campusoverflow.reputation.api.event.BountyAwardedEvent;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationProjectorTest {

    @Mock private NotificationRepository notifications;
    @Mock private IdentityApi identity;
    @Mock private QaQueryApi qa;

    private NotificationProjector projector;

    private static final Instant NOW = Instant.parse("2026-10-08T06:00:00Z");

    @BeforeEach
    void setUp() {
        projector = new NotificationProjector(notifications, identity, qa);
    }

    @Test
    @DisplayName("AnswerSubmitted：通知问题作者有人回答")
    void onAnswerSubmittedNotifiesQuestionAuthor() {
        when(notifications.exists(anyString(), anyLong())).thenReturn(false);
        projector.on(new AnswerSubmittedEvent("evt-1", NOW, 1L, 10L, 2L, 3L, "问题标题"));
        verify(notifications).save(any(Notification.class));
    }

    @Test
    @DisplayName("AnswerSubmitted：自问自答不通知")
    void onAnswerSubmittedSkipsSelfAnswer() {
        projector.on(new AnswerSubmittedEvent("evt-1", NOW, 1L, 10L, 2L, 2L, "问题标题"));
        verify(notifications, never()).save(any(Notification.class));
    }

    @Test
    @DisplayName("AnswerAccepted：通知回答作者被采纳")
    void onAnswerAcceptedNotifiesAnswerAuthor() {
        when(notifications.exists(anyString(), anyLong())).thenReturn(false);
        projector.on(new AnswerAcceptedEvent("evt-2", NOW, 1L, 10L, 2L, 3L, 4L, "问题标题"));
        verify(notifications).save(any(Notification.class));
    }

    @Test
    @DisplayName("CommentPosted：@提及产生通知")
    void onCommentPostedNotifiesMentionedUsers() {
        when(qa.findQuestion(10L)).thenReturn(Optional.of(new QuestionRef(10L, 3L, null, "问题", null, false)));
        when(identity.findByDisplayName("张三")).thenReturn(Optional.of(new UserSummary(5L, "张三", com.campusoverflow.shared.security.Role.STUDENT, true, "CS")));
        when(notifications.exists(anyString(), anyLong())).thenReturn(false);

        projector.on(new CommentPostedEvent("evt-3", NOW, 1L, 10L, 2L, "你好 @张三"));
        verify(notifications, org.mockito.Mockito.times(2)).save(any(Notification.class));
    }

    @Test
    @DisplayName("BountyAwarded：通知获奖者")
    void onBountyAwardedNotifiesWinner() {
        when(notifications.exists(anyString(), anyLong())).thenReturn(false);
        projector.on(new BountyAwardedEvent("evt-4", NOW, 1L, 10L, 3L, 5L, 50));
        verify(notifications).save(any(Notification.class));
    }

    @Test
    @DisplayName("BadgeAwarded：通知获得徽章")
    void onBadgeAwardedNotifiesUser() {
        when(notifications.exists(anyString(), anyLong())).thenReturn(false);
        projector.on(new BadgeAwardedEvent("evt-5", NOW, 42L, "FIRST_ANSWER", "初来乍到"));
        verify(notifications).save(any(Notification.class));
    }
}
