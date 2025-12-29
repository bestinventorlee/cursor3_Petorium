"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";

interface Report {
  id: string;
  type: string;
  reason: string;
  status: string;
  createdAt: string;
  reviewedAt?: string;
  notes?: string;
  reporter: {
    id: string;
    username: string;
    avatar?: string;
  };
  reportedUser?: {
    id: string;
    username: string;
    avatar?: string;
  };
  video?: {
    id: string;
    title: string;
    thumbnailUrl?: string;
  };
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");

  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (status) params.set("status", status);
      if (type) params.set("type", type);

      const response = await fetch(`/api/admin/reports?${params}`);
      const data = await response.json();
      setReports(data.reports);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  }, [page, status, type]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleReview = async (reportId: string, status: "RESOLVED" | "DISMISSED", notes?: string) => {
    try {
      const response = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, status, notes }),
      });

      if (response.ok) {
        fetchReports();
      }
    } catch (error) {
      console.error("Error reviewing report:", error);
    }
  };

  if (loading) {
    return (
      <AdminProtectedRoute>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </AdminLayout>
      </AdminProtectedRoute>
    );
  }

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">신고 검토</h1>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">모든 상태</option>
                <option value="PENDING">대기 중</option>
                <option value="RESOLVED">해결됨</option>
                <option value="DISMISSED">기각됨</option>
              </select>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">모든 유형</option>
                <option value="VIDEO">비디오</option>
                <option value="USER">사용자</option>
                <option value="COMMENT">댓글</option>
              </select>
            </div>
          </div>

          {/* Reports list */}
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          report.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : report.status === "RESOLVED"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {report.status}
                      </span>
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                        {report.type}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="mb-4">
                      <p className="font-medium mb-2">신고 사유:</p>
                      <p className="text-gray-700 dark:text-gray-300">{report.reason}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">신고자</p>
                        <p>@{report.reporter.username}</p>
                      </div>
                      {report.reportedUser && (
                        <div>
                          <p className="text-gray-500 mb-1">신고 대상</p>
                          <p>@{report.reportedUser.username}</p>
                        </div>
                      )}
                      {report.video && (
                        <div>
                          <p className="text-gray-500 mb-1">비디오</p>
                          <p className="line-clamp-1">{report.video.title}</p>
                        </div>
                      )}
                    </div>

                    {report.notes && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>관리자 메모:</strong> {report.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {report.status === "PENDING" && (
                    <div className="ml-4 flex flex-col space-y-2">
                      <button
                        onClick={() => handleReview(report.id, "RESOLVED")}
                        className="px-4 py-2 bg-green-600 text-white rounded text-sm"
                      >
                        해결
                      </button>
                      <button
                        onClick={() => handleReview(report.id, "DISMISSED")}
                        className="px-4 py-2 bg-gray-600 text-white rounded text-sm"
                      >
                        기각
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              페이지 {page} / {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                이전
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}

