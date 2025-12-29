"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import AdminLayout from "@/components/AdminLayout";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";

interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatar?: string;
  role: string;
  isBanned: boolean;
  bannedAt?: string;
  bannedReason?: string;
  followers: number;
  following: number;
  createdAt: string;
  _count: {
    videos: number;
    comments: number;
    likes: number;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [banned, setBanned] = useState<string>("");

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (search) params.set("search", search);
      if (role) params.set("role", role);
      if (banned) params.set("banned", banned);

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, role, banned]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleBan = async (userId: string, reason?: string) => {
    if (!confirm("이 사용자를 차단하시겠습니까?")) return;

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, reason }),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error("Error banning user:", error);
    }
  };

  const handleUnban = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/unban`, {
        method: "POST",
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error("Error unbanning user:", error);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("이 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;

    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error("Error deleting user:", error);
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
          <h1 className="text-2xl font-bold">사용자 관리</h1>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="검색 (사용자명, 이메일)"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">모든 역할</option>
                <option value="USER">사용자</option>
                <option value="MODERATOR">모더레이터</option>
                <option value="ADMIN">관리자</option>
              </select>
              <select
                value={banned}
                onChange={(e) => {
                  setBanned(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">모든 상태</option>
                <option value="false">활성</option>
                <option value="true">차단됨</option>
              </select>
            </div>
          </div>

          {/* Users table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      사용자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      역할
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      통계
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {user.avatar && (
                            <Image
                              src={user.avatar}
                              alt={user.username}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full"
                            />
                          )}
                          <div>
                            <div className="font-medium">@{user.username}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            user.role === "ADMIN"
                              ? "bg-red-100 text-red-800"
                              : user.role === "MODERATOR"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>비디오: {user._count.videos}</div>
                        <div>팔로워: {user.followers}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isBanned ? (
                          <span className="text-red-600 font-medium">차단됨</span>
                        ) : (
                          <span className="text-green-600 font-medium">활성</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        {user.isBanned ? (
                          <button
                            onClick={() => handleUnban(user.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            차단 해제
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBan(user.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            차단
                          </button>
                        )}
                        {user.role !== "ADMIN" && (
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            삭제
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
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
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}

