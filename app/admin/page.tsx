"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnalyticsData {
  totals: {
    users: number;
    videos: number;
    views: number;
    comments: number;
    likes: number;
  };
  growth: {
    newUsers: number;
    newVideos: number;
    newViews: number;
    period: string;
  };
  dailyData: Array<{
    date: string;
    users: number;
    videos: number;
    views: number;
  }>;
  topCreators: Array<{
    id: string;
    username: string;
    avatar?: string;
    followers: number;
    _count: {
      videos: number;
    };
  }>;
  engagement: {
    averageViewsPerVideo: number;
    averageLikesPerVideo: number;
    averageCommentsPerVideo: number;
    engagementRate: number;
  };
  reports: {
    pending: number;
    total: number;
  };
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AdminDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/analytics?period=${period}`);
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
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

  if (!data) {
    return (
      <AdminProtectedRoute>
        <AdminLayout>
          <div className="text-center py-12">
            <p className="text-gray-500">데이터를 불러올 수 없습니다</p>
          </div>
        </AdminLayout>
      </AdminProtectedRoute>
    );
  }

  const statsCards = [
    { label: "총 사용자", value: data.totals.users.toLocaleString(), icon: "👥", color: "blue" },
    { label: "총 비디오", value: data.totals.videos.toLocaleString(), icon: "🎥", color: "green" },
    { label: "총 조회수", value: data.totals.views.toLocaleString(), icon: "👁️", color: "purple" },
    { label: "대기 중인 신고", value: data.reports.pending, icon: "🚨", color: "red" },
  ];

  const growthCards = [
    { label: "신규 사용자", value: data.growth.newUsers, period: period },
    { label: "신규 비디오", value: data.growth.newVideos, period: period },
    { label: "신규 조회수", value: data.growth.newViews.toLocaleString(), period: period },
  ];

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Period selector */}
          <div className="flex justify-end space-x-2">
            {["7d", "30d", "90d", "all"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg ${
                  period === p
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                {p === "all" ? "전체" : p}
              </button>
            ))}
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsCards.map((stat, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                    <p className="text-2xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <span className="text-4xl">{stat.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Growth cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {growthCards.map((card, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
              >
                <p className="text-sm text-gray-600 dark:text-gray-400">{card.label}</p>
                <p className="text-2xl font-bold mt-2">{card.value}</p>
                <p className="text-xs text-gray-500 mt-1">최근 {card.period}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily growth chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">일일 성장 추이</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="#3b82f6" name="사용자" />
                  <Line type="monotone" dataKey="videos" stroke="#10b981" name="비디오" />
                  <Line type="monotone" dataKey="views" stroke="#8b5cf6" name="조회수" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Engagement metrics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">참여 지표</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">비디오당 평균 조회수</p>
                  <p className="text-2xl font-bold">{data.engagement.averageViewsPerVideo.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">비디오당 평균 좋아요</p>
                  <p className="text-2xl font-bold">{data.engagement.averageLikesPerVideo.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">비디오당 평균 댓글</p>
                  <p className="text-2xl font-bold">{data.engagement.averageCommentsPerVideo.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">참여율</p>
                  <p className="text-2xl font-bold">{data.engagement.engagementRate.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top creators */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">인기 크리에이터</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4">순위</th>
                    <th className="text-left py-3 px-4">사용자명</th>
                    <th className="text-right py-3 px-4">팔로워</th>
                    <th className="text-right py-3 px-4">비디오</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCreators.map((creator, index) => (
                    <tr key={creator.id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {creator.avatar && (
                            <img
                              src={creator.avatar}
                              alt={creator.username}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <span>@{creator.username}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">{creator.followers.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">{creator._count.videos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}

