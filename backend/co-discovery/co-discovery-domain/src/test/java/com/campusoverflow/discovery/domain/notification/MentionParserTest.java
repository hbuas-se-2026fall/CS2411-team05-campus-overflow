package com.campusoverflow.discovery.domain.notification;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MentionParserTest {

    @Test
    @DisplayName("提取 @昵称，最多 5 个")
    void extractMentions() {
        String text = "你好 @张三 @李四 还有 @王五 和 @赵六 @钱七 @孙八";
        Set<String> mentions = MentionParser.extract(text);
        assertThat(mentions).containsExactly("张三", "李四", "王五", "赵六", "钱七");
    }

    @Test
    @DisplayName("无 @ 时返回空集")
    void noMentions() {
        assertThat(MentionParser.extract("这是一段普通评论")).isEmpty();
    }
}
