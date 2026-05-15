import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { orpc as orpcType } from "../../apps/web/src/utils/orpc";

type ORPCUtils = typeof orpcType;

export function useFriendsSearch(orpc: ORPCUtils, currentUserId?: string) {
    const queryClient = useQueryClient();

    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [text, setText] = useState("");

    const usersQuery = useQuery(orpc.user.list.queryOptions());
    const users = usersQuery.data ?? [];

    const filteredUsers = useMemo(() => {
        const search = text.trim().toLowerCase();
        if (!search) return users;

        return users.filter((user) => {
            const email = String(user?.email ?? "").toLowerCase();
            const name = String(user?.name ?? "").toLowerCase();
            return email.includes(search) || name.includes(search);
        });
    }, [users, text]);

    const userProfileQuery = useQuery({
        ...orpc.user.getProfile.queryOptions({
            input: { userId: selectedUserId! },
        }),
        enabled: !!selectedUserId,
    });

    const sendFriendRequestMutation = useMutation(
        orpc.friends.sendFriendRequest.mutationOptions({
            onSuccess: async () => {
                await queryClient.invalidateQueries();
            },
        })
    );

    const sendFriendRequestToSelectedUser = async () => {
        if (sendFriendRequestMutation.isPending) return;
        if (!currentUserId) throw new Error("Not signed in");
        if (!selectedUserId) throw new Error("No user selected");
        await sendFriendRequestMutation.mutateAsync({ receiverId: selectedUserId });
    };

    return {
        text,
        setText,
        selectedUserId,
        setSelectedUserId,
        usersQuery,
        users,
        filteredUsers,
        userProfileQuery,
        sendFriendRequestMutation,
        sendFriendRequestToSelectedUser,
    };
}

export function useFriendsList(orpc: ORPCUtils, currentUserId?: string) {
    const queryClient = useQueryClient();

    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const friendsQuery = useQuery({
        ...orpc.friends.list.queryOptions(),
        enabled: !!currentUserId,
    });

    const friends = friendsQuery.data ?? [];

    const userProfileQuery = useQuery({
        ...orpc.user.getProfile.queryOptions({
            input: { userId: selectedUserId! },
        }),
        enabled: !!currentUserId && !!selectedUserId,
    });

    const selectedProfile = userProfileQuery.data;

    const removeFriendMutation = useMutation(
        orpc.friends.remove.mutationOptions({
            onSuccess: async () => {
                await queryClient.invalidateQueries();
                setSelectedUserId(null);
            },
        })
    );

    const removeSelectedFriend = async () => {
        if (removeFriendMutation.isPending) return;
        if (!currentUserId) throw new Error("Not signed in");
        if (!selectedUserId) throw new Error("No friend selected");
        await removeFriendMutation.mutateAsync({ friendId: selectedUserId });
    };

    return {
        selectedUserId,
        setSelectedUserId,
        friendsQuery,
        friends,
        userProfileQuery,
        selectedProfile,
        removeFriendMutation,
        removeSelectedFriend,
    };
}