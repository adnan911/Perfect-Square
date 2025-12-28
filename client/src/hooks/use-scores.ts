import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertScore } from "@shared/routes";

export function useScores() {
  return useQuery({
    queryKey: [api.scores.list.path],
    queryFn: async () => {
      const res = await fetch(api.scores.list.path);
      if (!res.ok) throw new Error("Failed to fetch scores");
      return api.scores.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertScore) => {
      // Validate with Zod schema before sending
      const validated = api.scores.create.input.parse(data);
      
      const res = await fetch(api.scores.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to submit score");
      }
      
      return api.scores.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.scores.list.path] });
    },
  });
}
