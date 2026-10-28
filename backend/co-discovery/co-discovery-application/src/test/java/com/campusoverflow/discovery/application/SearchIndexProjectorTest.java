package com.campusoverflow.discovery.application;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campusoverflow.discovery.domain.search.SearchIndex;
import com.campusoverflow.qa.api.event.AnswerAcceptedEvent;
import com.campusoverflow.qa.api.event.AnswerSubmittedEvent;
import com.campusoverflow.qa.api.event.QuestionPostedEvent;
import com.campusoverflow.qa.api.event.VoteCastEvent;
import com.campusoverflow.shared.event.ProcessedEventStore;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SearchIndexProjectorTest {

    @Mock private SearchIndex index;
    @Mock private ProcessedEventStore processed;

    private SearchIndexProjector projector;

    private static final Instant NOW = Instant.parse("2026-10-08T06:00:00Z");

    @BeforeEach
    void setUp() {
        projector = new SearchIndexProjector(index, processed);
    }

    @Test
    @DisplayName("QuestionPosted：新问题入索引")
    void onQuestionPostedInsertsDocument() {
        when(processed.markProcessed(anyString(), anyString())).thenReturn(true);
        projector.on(new QuestionPostedEvent("evt-1", NOW, 10L, 2L, 1L, "标题", "正文", List.of("java")));
        verify(index).insert(any());
    }

    @Test
    @DisplayName("AnswerSubmitted：回答数 +1")
    void onAnswerSubmittedAdjustsAnswerCount() {
        when(processed.markProcessed(anyString(), anyString())).thenReturn(true);
        projector.on(new AnswerSubmittedEvent("evt-2", NOW, 1L, 10L, 2L, 3L, "标题"));
        verify(index).adjustAnswerCount(eq(10L), eq(1), any());
    }

    @Test
    @DisplayName("AnswerAccepted：标记已采纳")
    void onAnswerAcceptedMarksAccepted() {
        when(processed.markProcessed(anyString(), anyString())).thenReturn(true);
        projector.on(new AnswerAcceptedEvent("evt-3", NOW, 1L, 10L, 2L, 3L, 4L, "标题"));
        verify(index).markAccepted(eq(10L), any());
    }

    @Test
    @DisplayName("VoteCast：问题投票调整分数")
    void onVoteCastAdjustsQuestionScore() {
        when(processed.markProcessed(anyString(), anyString())).thenReturn(true);
        projector.on(new VoteCastEvent("evt-4", NOW, "QUESTION", 10L, 3L, 5L, 10L, 0, 1));
        verify(index).adjustScore(eq(10L), eq(1));
    }

    @Test
    @DisplayName("重复事件：不重复更新索引")
    void duplicateEventDoesNotUpdate() {
        when(processed.markProcessed(anyString(), anyString())).thenReturn(false);
        projector.on(new QuestionPostedEvent("evt-1", NOW, 10L, 2L, 1L, "标题", "正文", List.of("java")));
        verify(index, never()).insert(any());
    }
}
