"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  generateAiReplyAction,
  updateReplyDraftAction,
  postReplyAction,
  triggerManualSync,
} from "@/app/actions/reviews";
import {
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Star,
  Edit3,
} from "lucide-react";

export interface ReviewItemData {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  reviewedAt: string;
  googleReviewId: string;
  locationId: string;
  replies: {
    id: string;
    content: string;
    status: "DRAFT" | "POSTING" | "POSTED" | "FAILED";
    postedAt?: string | null;
    failureReason?: string | null;
    generatedBy: string;
  }[];
}

interface ReviewListProps {
  initialReviews: ReviewItemData[];
  locationId: string;
}

export function ReviewList({ initialReviews, locationId }: ReviewListProps) {
  const [reviews, setReviews] = useState<ReviewItemData[]>(initialReviews);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [postingReplyId, setPostingReplyId] = useState<string | null>(null);
  const [editingDrafts, setEditingDrafts] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Handle manual sync
  const handleSync = async () => {
    setSyncing(true);
    setErrorMsg("");
    try {
      await triggerManualSync(locationId);
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sync reviews");
    } finally {
      setSyncing(false);
    }
  };

  // Handle AI reply generation
  const handleGenerateAiReply = async (reviewId: string) => {
    setGeneratingId(reviewId);
    setErrorMsg("");
    try {
      const res = await generateAiReplyAction(reviewId);
      if (res.success && res.reply) {
        setReviews((prev) =>
          prev.map((rev) =>
            rev.id === reviewId
              ? {
                  ...rev,
                  replies: [res.reply as ReviewItemData["replies"][number]],
                }
              : rev
          )
        );
        setEditingDrafts((prev) => ({
          ...prev,
          [res.reply.id]: res.reply.content,
        }));
      }
    } catch (err: any) {
      setErrorMsg(err.message || "AI reply generation failed");
    } finally {
      setGeneratingId(null);
    }
  };

  // Handle posting reply to Google
  const handlePostReply = async (reviewId: string, replyId: string) => {
    setPostingReplyId(replyId);
    setErrorMsg("");
    try {
      // Save draft text if edited
      const draftContent = editingDrafts[replyId];
      if (draftContent) {
        await updateReplyDraftAction(replyId, draftContent);
      }

      const res = await postReplyAction(replyId);
      if (res.success && res.reply) {
        setReviews((prev) =>
          prev.map((rev) =>
            rev.id === reviewId
              ? {
                  ...rev,
                  replies: [res.reply as ReviewItemData["replies"][number]],
                }
              : rev
          )
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to post reply to Google");
    } finally {
      setPostingReplyId(null);
    }
  };

  // Filter logic
  const filteredReviews = reviews.filter((review) => {
    const postedReply = review.replies.find((r) => r.status === "POSTED");
    const failedReply = review.replies.find((r) => r.status === "FAILED");
    const draftReply = review.replies.find((r) => r.status === "DRAFT");

    if (statusFilter === "PENDING" && postedReply) return false;
    if (statusFilter === "REPLIED" && !postedReply) return false;
    if (statusFilter === "FAILED" && !failedReply) return false;

    if (ratingFilter > 0 && review.rating !== ratingFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = review.reviewerName.toLowerCase().includes(q);
      const matchComment = (review.comment || "").toLowerCase().includes(q);
      if (!matchName && !matchComment) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Search & Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by reviewer name or comment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Sync Button */}
        <Button onClick={handleSync} disabled={syncing} variant="outline" className="h-10">
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin text-indigo-400" : ""}`} />
          {syncing ? "Syncing..." : "Sync Latest Reviews"}
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        {/* Status Filters */}
        <div className="flex items-center space-x-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {[
            { id: "ALL", label: "All Reviews" },
            { id: "PENDING", label: "Pending Reply" },
            { id: "REPLIED", label: "Replied" },
            { id: "FAILED", label: "Failed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === tab.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Rating Filter */}
        <div className="flex items-center space-x-1">
          <span className="text-xs text-slate-400 mr-2 flex items-center">
            <Filter className="h-3.5 w-3.5 mr-1" /> Rating:
          </span>
          {[0, 5, 4, 3, 2, 1].map((stars) => (
            <button
              key={stars}
              onClick={() => setRatingFilter(stars)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                ratingFilter === stars
                  ? "bg-slate-800 text-amber-400 border border-slate-700"
                  : "text-slate-400 hover:bg-slate-900"
              }`}
            >
              {stars === 0 ? "All" : `${stars} ★`}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-rose-950/60 border border-rose-800 p-3 text-xs text-rose-300 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="text-rose-400 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Review Cards List */}
      {filteredReviews.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40 py-16 text-center">
          <p className="text-slate-400 text-sm">No reviews matching your filters.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const activeReply = review.replies[0];
            const isGenerating = generatingId === review.id;
            const isPosting = activeReply && postingReplyId === activeReply.id;
            const currentDraftText =
              activeReply && editingDrafts[activeReply.id] !== undefined
                ? editingDrafts[activeReply.id]
                : activeReply?.content || "";

            return (
              <Card key={review.id} className="border-slate-800 bg-slate-900/70 hover:border-slate-750">
                <CardContent className="p-6 space-y-4">
                  {/* Review Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="text-base font-semibold text-white">
                          {review.reviewerName}
                        </span>
                        <div className="flex items-center text-amber-400 text-sm">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i}>{i < review.rating ? "★" : "☆"}</span>
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        Reviewed on {new Date(review.reviewedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {activeReply?.status === "POSTED" && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Posted to Google
                        </span>
                      )}
                      {activeReply?.status === "FAILED" && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950 text-rose-400 border border-rose-800/80">
                          <AlertCircle className="h-3.5 w-3.5 mr-1" /> Post Failed
                        </span>
                      )}
                      {activeReply?.status === "DRAFT" && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/80">
                          <Edit3 className="h-3.5 w-3.5 mr-1" /> Draft Ready
                        </span>
                      )}
                      {activeReply?.status === "POSTING" && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800/80">
                          <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> Posting
                        </span>
                      )}
                      {!activeReply && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800/80">
                          Pending Reply
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Review Text */}
                  <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-3.5 rounded-lg border border-slate-800/60">
                    {review.comment || <span className="italic text-slate-500">No review text provided</span>}
                  </p>

                  {/* Reply Section */}
                  <div className="pt-2 border-t border-slate-800/60 space-y-3">
                    {activeReply?.status === "POSTED" ? (
                      <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-3.5 space-y-1">
                        <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
                          <span>Google Reply (Published)</span>
                          {activeReply.postedAt && (
                            <span>{new Date(activeReply.postedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                        <p className="text-sm text-emerald-200">{activeReply.content}</p>
                      </div>
                    ) : activeReply?.status === "POSTING" ? (
                      <p className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-3 text-sm text-amber-200">Your reply is being posted to Google. Refresh shortly to see the outcome.</p>
                    ) : (
                      <div className="space-y-3">
                        {/* Draft Text Area */}
                        {activeReply && (
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-slate-400">
                              Reply Text (AI Drafted)
                            </label>
                            <textarea
                              rows={3}
                              value={currentDraftText}
                              onChange={(e) =>
                                setEditingDrafts((prev) => ({
                                  ...prev,
                                  [activeReply.id]: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                            />
                            {activeReply.failureReason && (
                              <p className="text-xs text-rose-400">
                                Reason: {activeReply.failureReason}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            onClick={() => handleGenerateAiReply(review.id)}
                            disabled={isGenerating}
                            variant={activeReply ? "outline" : "default"}
                            size="sm"
                            className="shadow-sm"
                          >
                            <Sparkles className={`h-3.5 w-3.5 mr-1.5 ${isGenerating ? "animate-spin text-indigo-400" : ""}`} />
                            {isGenerating
                              ? "Generating AI Reply..."
                              : activeReply
                              ? "Regenerate with AI"
                              : "Generate AI Reply"}
                          </Button>

                          {activeReply && (
                            <Button
                              onClick={() => handlePostReply(review.id, activeReply.id)}
                              disabled={isPosting || activeReply.status !== "DRAFT"}
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                              <Send className="h-3.5 w-3.5 mr-1.5" />
                              {isPosting ? "Posting to Google..." : "Post Reply to Google"}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
