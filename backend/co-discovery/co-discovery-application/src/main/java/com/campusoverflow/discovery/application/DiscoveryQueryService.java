package com.campusoverflow.discovery.application;

import com.campusoverflow.discovery.domain.search.RelatedQuestionPolicy;
import com.campusoverflow.discovery.domain.search.SearchHit;
import com.campusoverflow.discovery.domain.search.SearchIndex;
import com.campusoverflow.discovery.domain.search.SearchPort;
import com.campusoverflow.discovery.domain.search.SearchQuery;
import com.campusoverflow.identity.api.IdentityApi;
import com.campusoverflow.identity.api.UserSummary;
import com.campusoverflow.shared.page.PageResult;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 用例：搜索与筛选、相关问题推荐。 */
@Service
@Transactional(readOnly = true)
public class DiscoveryQueryService {

    private final SearchPort search;
    private final SearchIndex index;
    private final IdentityApi identity;

    public DiscoveryQueryService(SearchPort search, SearchIndex index, IdentityApi identity) {
        this.search = search;
        this.index = index;
        this.identity = identity;
    }

    public PageResult<SearchResultView> search(SearchQuery query) {
        PageResult<SearchHit> hits = search.search(query);
        Set<Long> authorIds = hits.items().stream().map(SearchHit::authorId).collect(Collectors.toSet());
        Map<Long, UserSummary> users = identity.findUsers(authorIds);
        List<SearchResultView> views = hits.items().stream()
                .map(h -> new SearchResultView(h.questionId(), h.title(), h.snippet(), h.tags(), h.courseId(),
                        toAuthor(h.authorId(), users.get(h.authorId())), h.score(), h.answerCount(), h.accepted(),
                        h.bountyOpen(), h.createdAt()))
                .toList();
        return new PageResult<>(views, hits.total(), hits.page(), hits.size());
    }

    public List<RelatedQuestionView> related(long questionId, int limit) {
        List<String> tags = index.findTags(questionId);
        if (tags.isEmpty()) {
            return List.of();
        }
        List<SearchIndex.RelatedCandidate> candidates = index.findCandidatesSharingTags(questionId, tags, limit * 2);
        return RelatedQuestionPolicy.rank(candidates, tags.size(), limit).stream()
                .map(c -> new RelatedQuestionView(c.questionId(), c.title(), c.answerCount(), c.accepted(),
                        RelatedQuestionPolicy.jaccard(c.sharedTags(), tags.size(), c.tagCount())))
                .toList();
    }

    private static SearchResultView.Author toAuthor(long id, UserSummary u) {
        return new SearchResultView.Author(id, u == null ? "未知" : u.displayName(),
                u == null ? null : u.role().name(), u != null && u.verified());
    }
}
