"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";

interface HealthData {
  timestamp: string;
  status: string;
  services: {
    database?: {
      status: string;
      responseTime?: number;
      error?: string;
    };
    redis?: {
      status: string;
      responseTime?: number;
      error?: string;
    };
    metrics?: {
      activeUsers24h: number;
      activeVideos24h: number;
      pendingReports: number;
    };
  };
}

export default function AdminHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const response = await fetch("/api/admin/health");
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error("Error fetching health:", error);
    } finally {
      setLoading(false);
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

  if (!health) {
    return (
      <AdminProtectedRoute>
        <AdminLayout>
          <div className="text-center py-12">
            <p className="text-gray-500">헬스 데이터를 불러올 수 없습니다</p>
          </div>
        </AdminLayout>
      </AdminProtectedRoute>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800";
      case "unhealthy":
        return "bg-red-100 text-red-800";
      case "not_configured":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">시스템 상태</h1>
            <button
              onClick={fetchHealth}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              새로고침
            </button>
          </div>

          {/* Overall status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">전체 상태</h2>
                <p className="text-sm text-gray-500 mt-1">
                  마지막 업데이트: {new Date(health.timestamp).toLocaleString()}
                </p>
              </div>
              <span
                className={`px-4 py-2 rounded-lg font-medium ${getStatusColor(health.status)}`}
              >
                {health.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Services */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Database */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">데이터베이스</h3>
              {health.services.database ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">상태</span>
                    <span
                      className={`px-2 py-1 text-xs rounded ${getStatusColor(
                        health.services.database.status
                      )}`}
                    >
                      {health.services.database.status}
                    </span>
                  </div>
                  {health.services.database.responseTime !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">응답 시간</span>
                      <span className="text-sm font-medium">
                        {health.services.database.responseTime}ms
                      </span>
                    </div>
                  )}
                  {health.services.database.error && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600">
                      {health.services.database.error}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">데이터 없음</p>
              )}
            </div>

            {/* Redis */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Redis</h3>
              {health.services.redis ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">상태</span>
                    <span
                      className={`px-2 py-1 text-xs rounded ${getStatusColor(
                        health.services.redis.status
                      )}`}
                    >
                      {health.services.redis.status}
                    </span>
                  </div>
                  {health.services.redis.responseTime !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">응답 시간</span>
                      <span className="text-sm font-medium">
                        {health.services.redis.responseTime}ms
                      </span>
                    </div>
                  )}
                  {health.services.redis.error && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600">
                      {health.services.redis.error}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">데이터 없음</p>
              )}
            </div>
          </div>

          {/* Metrics */}
          {health.services.metrics && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">24시간 메트릭</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">활성 사용자</p>
                  <p className="text-2xl font-bold">{health.services.metrics.activeUsers24h}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">활성 비디오</p>
                  <p className="text-2xl font-bold">{health.services.metrics.activeVideos24h}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">대기 중인 신고</p>
                  <p className="text-2xl font-bold">{health.services.metrics.pendingReports}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}

