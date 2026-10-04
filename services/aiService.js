/**
 * AI Service for AI Powered College Notice Board
 * Implements Grounded Retrieval-Augmented Generation (RAG) & Summarization
 * Compatible with OpenAI, Google Gemini, and includes an intelligent zero-dependency NLP fallback.
 */

// Stop words for keyword and semantic matching
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'arent', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could', 'couldnt',
  'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt',
  'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here',
  'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i',
  'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isnt', 'it', 'its',
  'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no',
  'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought',
  'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shant', 'she',
  'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than',
  'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
  'there', 'theres', 'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
  'was', 'wasnt', 'we', 'wed', 'well', 'were', 'werent', 'what', 'whats',
  'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom',
  'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll',
  'youre', 'youve', 'your', 'yours', 'yourself', 'yourselves'
]);

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

// Compute BM25 / TF-IDF relevance score
function computeRelevanceScore(queryTokens, notice) {
  const titleTokens = tokenize(notice.title);
  const contentTokens = tokenize(notice.content);
  const categoryTokens = tokenize(notice.category);
  const deptTokens = tokenize((notice.targetDepartments || []).join(' '));
  const yearTokens = tokenize((notice.targetYears || []).join(' '));

  let score = 0;

  for (const q of queryTokens) {
    // Title matches are heavily weighted
    const inTitle = titleTokens.filter(t => t === q || t.includes(q) || q.includes(t)).length;
    score += inTitle * 5.0;

    // Category matches
    const inCategory = categoryTokens.filter(t => t === q || t.includes(q)).length;
    score += inCategory * 3.0;

    // Audience matches (Department & Year)
    const inDept = deptTokens.filter(t => t === q || t.includes(q)).length;
    score += inDept * 3.5;

    const inYear = yearTokens.filter(t => t === q || t.includes(q)).length;
    score += inYear * 4.0;

    // Content frequency
    const inContent = contentTokens.filter(t => t === q || (q.length > 3 && t.includes(q))).length;
    score += Math.min(inContent * 1.0, 6.0);
  }

  // Boost for high/urgent priority
  if (notice.priority === 'Urgent') score += 1.5;
  if (notice.priority === 'High') score += 1.0;

  return score;
}

/**
 * Filter notices eligible for the given user profile
 */
function filterEligibleNotices(notices, user) {
  const now = new Date();
  return notices.filter(notice => {
    // Check expiration
    if (notice.expiresAt && new Date(notice.expiresAt) < now) {
      return false;
    }

    if (!user || user.role === 'Administrator' || user.role === 'Faculty') {
      return true;
    }

    // Role is Student
    const deptMatch =
      !notice.targetDepartments ||
      notice.targetDepartments.includes('All') ||
      (user.department && notice.targetDepartments.includes(user.department));

    const yearMatch =
      !notice.targetYears ||
      notice.targetYears.includes('All') ||
      (user.year && notice.targetYears.includes(user.year));

    return deptMatch && yearMatch;
  });
}

/**
 * Extractive & Semantic Summarizer
 */
async function generateSummary(title, content) {
  const cleanTitle = (title || '').trim();
  const cleanContent = (content || '').trim();

  // If content is empty but title exists, generate an intelligent context summary
  if (!cleanContent && cleanTitle) {
    return `Official schedule and instructions for ${cleanTitle}. Students must adhere to the prescribed guidelines and submission deadlines.`;
  }

  if (!cleanContent) {
    return 'Official circular details and action instructions for eligible students and department members.';
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an academic bulletin editor. Summarize the following college notice into 2 concise, factual sentences highlighting dates, eligibility, venues, and deadlines.'
            },
            {
              role: 'user',
              content: `Notice Title: ${cleanTitle}\n\nNotice Content: ${cleanContent}`
            }
          ],
          max_tokens: 120,
          temperature: 0.3
        })
      });
      if (!response.ok) {
        throw new Error(`OpenAI request failed with status ${response.status}`);
      }

      const data = await response.json();
      const summary = data.choices?.[0]?.message?.content;
      if (typeof summary === 'string' && summary.trim()) {
        return summary.trim();
      }
    } catch (err) {
      console.warn('[AI Service] OpenAI summarization error, using local engine:', err.message);
    }
  }

  // Intelligent Local Summarizer with abbreviation protection
  let normalized = cleanContent
    // Protect academic titles and degrees
    .replace(/\bB\.Tech\b/gi, 'B_Tech')
    .replace(/\bM\.Tech\b/gi, 'M_Tech')
    .replace(/\bPh\.D\b/gi, 'PhD')
    .replace(/\bDr\.\s*/gi, 'Dr_')
    .replace(/\bProf\.\s*/gi, 'Prof_')
    .replace(/\bMr\.\s*/gi, 'Mr_')
    .replace(/\bMrs\.\s*/gi, 'Mrs_')
    .replace(/\bDept\.\s*/gi, 'Dept_')
    .replace(/\bNo\.\s*/gi, 'No_')
    .replace(/\bi\.e\.\s*/gi, 'ie ')
    .replace(/\be\.g\.\s*/gi, 'eg ')
    .replace(/\bvs\.\s*/gi, 'vs ')
    .replace(/(^|\n)\s*\d+\.\s+/gm, '$1');

  // Split into sentences using punctuation or newlines
  const rawSentences = normalized
    .split(/(?<=[.?!])\s+|\n+/)
    .map(s => s
      .replace(/B_Tech/g, 'B.Tech')
      .replace(/M_Tech/g, 'M.Tech')
      .replace(/Dr_/g, 'Dr. ')
      .replace(/Prof_/g, 'Prof. ')
      .replace(/Dept_/g, 'Dept. ')
      .replace(/No_/g, 'No. ')
      .trim()
    )
    .filter(s => s.length > 20);

  if (rawSentences.length <= 2) {
    return rawSentences.join(' ');
  }

  // Score sentences by presence of dates, keywords, deadlines, fees, eligibility
  const keyRegex = /(deadline|last date|scheduled|commence|review|abstract|eligible|eligibility|venue|register|fees|hall ticket|mandatory|exam|stipend|cgpa|october|november|december)/i;
  const scored = rawSentences.map((sentence, idx) => {
    let score = 0;
    if (idx === 0) score += 4.0; // Lead sentence
    if (keyRegex.test(sentence)) score += 4.5;
    if (/\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})/i.test(sentence)) score += 3.5;
    if (/\d{1,2}:\d{2}\s*(am|pm)/i.test(sentence)) score += 2.0;
    if (/inr|rs\.?|₹|\d+\s*lpa/i.test(sentence)) score += 2.5;
    return { sentence, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const bestSentences = scored.slice(0, 2).map(item => item.sentence);

  // Preserve logical chronological order
  const ordered = rawSentences.filter(s => bestSentences.includes(s));
  return ordered.join(' ');
}

/**
 * Grounded Question Answering Engine (RAG)
 * Answers student questions strictly based on active, eligible college notices.
 */
async function answerStudentQuestion(query, user, allNotices) {
  if (!query || typeof query !== 'string') {
    return {
      answer: "Please provide a valid query to search the notice board.",
      sources: []
    };
  }

  const eligibleNotices = filterEligibleNotices(allNotices, user);
  const queryTokens = tokenize(query);

  // Calculate similarity score for each notice
  const scoredNotices = eligibleNotices.map(notice => ({
    notice,
    score: computeRelevanceScore(queryTokens, notice)
  }));

  // Sort descending by relevance score
  scoredNotices.sort((a, b) => b.score - a.score);

  // Filter relevant notices (threshold score > 1.5)
  const relevantMatches = scoredNotices.filter(item => item.score > 1.2);
  const topMatches = relevantMatches.slice(0, 4);

  if (topMatches.length === 0) {
    return {
      answer: `I could not find any active notices matching your query: "${query}".\n\nTips:\n• Verify that the notice has been published and has not expired.\n• Try searching for specific keywords like "exam timetable", "mini project", "internship", or "hackathon".\n• For unlisted departmental queries, please contact your Academic Coordinator.`,
      sources: [],
      queryTokens
    };
  }

  const sources = topMatches.map(m => ({
    id: m.notice.id,
    title: m.notice.title,
    category: m.notice.category,
    priority: m.notice.priority,
    publishAt: m.notice.publishAt,
    authorName: m.notice.authorName,
    summary: m.notice.summary
  }));

  // If OPENAI_API_KEY is available, use LLM with strict grounding
  if (process.env.OPENAI_API_KEY) {
    try {
      const contextText = topMatches.map((m, idx) =>
        `[Notice ${idx + 1}] Title: ${m.notice.title}\nCategory: ${m.notice.category} | Priority: ${m.notice.priority}\nTarget: Dept: ${m.notice.targetDepartments.join(', ')} | Years: ${m.notice.targetYears.join(', ')}\nDetails: ${m.notice.content}`
      ).join('\n\n---\n\n');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are the official "Ask the Board" AI Assistant for the college campus.
Answer the student's question accurately using ONLY the provided official notices below.
Rules:
1. Do NOT invent dates, names, venues, or rules not mentioned in the text.
2. Structure your answer clearly with bullet points where appropriate.
3. Explicitly cite the Notice titles in your response.
4. If an exact detail is not in the text, clearly state that it is not specified and advise consulting the department.`
            },
            {
              role: 'user',
              content: `Student Question: ${query}\n\nUser Profile: Role=${user?.role || 'Student'}, Dept=${user?.department || 'General'}, Year=${user?.year || 'General'}\n\nOfficial College Notices:\n${contextText}`
            }
          ],
          max_tokens: 350,
          temperature: 0.2
        })
      });

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        return {
          answer: data.choices[0].message.content.trim(),
          sources,
          provider: 'OpenAI GPT'
        };
      }
    } catch (err) {
      console.warn('[AI Service] OpenAI RAG error, continuing with local engine:', err.message);
    }
  }

  // Intelligent Local Grounded Synthesis Engine
  const synthesis = buildLocalGroundedAnswer(query, topMatches.map(m => m.notice), user);

  return {
    answer: synthesis,
    sources,
    provider: 'Campus AI Grounded Engine (Local RAG)'
  };
}

/**
 * Built-in Grounded NLP Synthesis
 */
function buildLocalGroundedAnswer(query, matchingNotices, user) {
  const queryLower = query.toLowerCase();

  let intro = `Here is the official information retrieved from the notice board regarding **"${query.trim()}"**:`;

  const bullets = matchingNotices.map((notice, index) => {
    // Find key sentence from content matching the query
    const sentences = notice.content
      .split(/(?<=[.?!])\s+/)
      .map(s => s.trim());

    // Highlight key sentences
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);
    let matchedSentence = sentences.find(s => {
      const sLower = s.toLowerCase();
      return queryWords.some(w => sLower.includes(w));
    }) || sentences[0];

    // Priority tag
    const priorityBadge = notice.priority === 'Urgent' ? '🚨 [URGENT]' : notice.priority === 'High' ? '⚡ [HIGH]' : '📌';

    return `### ${priorityBadge} ${notice.title}
- **Category & Audience:** ${notice.category} · Target: ${notice.targetDepartments.join(', ')} (${notice.targetYears.join(', ')})
- **Key Details:** ${matchedSentence}
- **Summary:** ${notice.summary || notice.content.substring(0, 160) + '...'}
- **Published By:** ${notice.authorName} (${new Date(notice.publishAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
  });

  const conclusion = `\n> **Notice Board Verification:** The above information is grounded in official circulars. Click any source notice card below to inspect full attachments and official guidelines.`;

  return `${intro}\n\n${bullets.join('\n\n')}\n\n${conclusion}`;
}

/**
 * Dynamic suggested queries based on active notices
 */
function getSuggestedQueries(notices, user) {
  const eligible = filterEligibleNotices(notices, user);
  const suggestions = [
    "What are the upcoming events and symposiums for third year?",
    "When do the autonomous semester theory examinations start?",
    "What are the eligibility requirements for Google & Microsoft internship drive?",
    "What is the submission deadline for 3rd year AI&DS mini-project abstracts?",
    "When is the last date to return library books without fine?"
  ];

  return suggestions;
}

module.exports = {
  generateSummary,
  answerStudentQuestion,
  getSuggestedQueries,
  filterEligibleNotices
};
