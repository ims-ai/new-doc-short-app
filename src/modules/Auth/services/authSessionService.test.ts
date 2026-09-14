import { afterEach, describe, expect, it } from "vitest";
import { queryClient } from "@/shared/query/queryClient";
import { queryKeys } from "@/shared/query/keys";
import { dropSubmissionScopedQueries } from "@/modules/Auth/services/authSessionService";

afterEach(() => {
  queryClient.clear();
});

describe("dropSubmissionScopedQueries", () => {
  it("drops the order + submission question tree, keeps the master tree and speciality", () => {
    queryClient.setQueryData(queryKeys.order.detail(5), { id: 5 });
    queryClient.setQueryData(queryKeys.questions.submission(5), [{ id: 1 }]);
    queryClient.setQueryData(queryKeys.questions.bySpeciality(10512), [{ id: 100 }]);
    queryClient.setQueryData(queryKeys.speciality.current(), { id: 10512 });

    dropSubmissionScopedQueries();

    expect(queryClient.getQueryData(queryKeys.order.detail(5))).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.questions.submission(5))).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.questions.bySpeciality(10512))).toEqual([
      { id: 100 },
    ]);
    expect(queryClient.getQueryData(queryKeys.speciality.current())).toEqual({ id: 10512 });
  });
});
