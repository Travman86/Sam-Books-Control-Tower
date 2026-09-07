import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  activityTable,
  db,
  featuresTable,
  managementActionsTable,
  projectsTable,
  reviewsTable,
} from "@workspace/db";
import {
  CreateFeatureBody,
  CreateFeatureResponse,
  CreateManagementActionBody,
  CreateManagementActionResponse,
  CreateProjectBody,
  CreateProjectResponse,
  DecideReviewBody,
  DecideReviewParams,
  DecideReviewResponse,
  DecideManagementActionBody,
  DecideManagementActionParams,
  DecideManagementActionResponse,
  GetDashboardResponse,
  GetProjectParams,
  GetProjectResponse,
  GetManagementActionParams,
  GetManagementActionResponse,
  GetReviewParams,
  GetReviewResponse,
  ListActivityQueryParams,
  ListActivityResponse,
  ListFeaturesQueryParams,
  ListFeaturesResponse,
  ListManagementActionsQueryParams,
  ListManagementActionsResponse,
  ListProjectsResponse,
  ListReviewsQueryParams,
  ListReviewsResponse,
  RevokeProjectParams,
  RevokeProjectResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function projectView(project: typeof projectsTable.$inferSelect) {
  const features = await db
    .select()
    .from(featuresTable)
    .where(eq(featuresTable.projectId, project.id));
  const featureIds = new Set(features.map((feature) => feature.id));
  const reviews = await db.select().from(reviewsTable);

  return {
    ...project,
    features: features.length,
    pendingReviews: reviews.filter(
      (review) => featureIds.has(review.featureId) && review.status === "pending",
    ).length,
  };
}

async function reviewViews(status?: string) {
  const reviews = status
    ? await db
        .select()
        .from(reviewsTable)
        .where(eq(reviewsTable.status, status))
        .orderBy(desc(reviewsTable.submittedAt))
    : await db
        .select()
        .from(reviewsTable)
        .orderBy(desc(reviewsTable.submittedAt));
  const features = await db.select().from(featuresTable);
  const projects = await db.select().from(projectsTable);

  return reviews.map((review) => {
    const feature = features.find((item) => item.id === review.featureId);
    const project = projects.find((item) => item.id === feature?.projectId);
    return {
      ...review,
      featureName: feature?.name ?? "Unknown feature",
      projectName: project?.name ?? "Unknown project",
    };
  });
}

async function managementActionViews(status?: string, projectId?: string) {
  const filters = [
    status ? eq(managementActionsTable.status, status) : undefined,
    projectId ? eq(managementActionsTable.projectId, projectId) : undefined,
  ].filter(
    (
      filter,
    ): filter is Exclude<typeof filter, undefined> => filter !== undefined,
  );
  const actions =
    filters.length > 0
      ? await db
          .select()
          .from(managementActionsTable)
          .where(filters.length === 1 ? filters[0] : and(...filters))
          .orderBy(desc(managementActionsTable.submittedAt))
      : await db
          .select()
          .from(managementActionsTable)
          .orderBy(desc(managementActionsTable.submittedAt));
  const projects = await db.select().from(projectsTable);

  return actions.map((action) => ({
    ...action,
    projectName:
      projects.find((project) => project.id === action.projectId)?.name ??
      "Unknown project",
  }));
}

router.get("/dashboard", async (_req, res): Promise<void> => {
  const [projects, features, reviews, managementActions, activity] =
    await Promise.all([
    db.select().from(projectsTable),
    db.select().from(featuresTable),
    db.select().from(reviewsTable),
    db.select().from(managementActionsTable),
    db
      .select()
      .from(activityTable)
      .orderBy(desc(activityTable.occurredAt))
      .limit(6),
    ]);
  const allReviews = await reviewViews();
  const latestReview =
    allReviews.find((review) => review.status === "pending") ?? null;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const decided = reviews.filter(
    (review) => review.decidedAt && review.decidedAt.getTime() >= weekAgo,
  );
  const averageHours =
    decided.length === 0
      ? 0
      : decided.reduce(
          (sum, review) =>
            sum +
            ((review.decidedAt?.getTime() ?? review.submittedAt.getTime()) -
              review.submittedAt.getTime()) /
              3_600_000,
          0,
        ) / decided.length;

  res.json(
    GetDashboardResponse.parse({
      pendingReviews: reviews.filter((review) => review.status === "pending")
        .length,
      connectedProjects: projects.filter(
        (project) => project.status === "connected",
      ).length,
      protectedFeatures: features.filter(
        (feature) => feature.status === "protected",
      ).length,
      approvedThisWeek: decided.filter(
        (review) => review.status === "approved",
      ).length,
      blockedChanges: reviews.filter((review) => review.status === "rejected")
        .length,
      reviewSlaHours: Math.round(averageHours * 10) / 10,
      pendingManagementActions: managementActions.filter(
        (action) => action.status === "pending",
      ).length,
      latestReview,
      activity,
    }),
  );
});

router.get("/projects", async (_req, res): Promise<void> => {
  const projects = await db
    .select()
    .from(projectsTable)
    .orderBy(desc(projectsTable.connectedAt));
  res.json(
    ListProjectsResponse.parse(
      await Promise.all(projects.map((project) => projectView(project))),
    ),
  );
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db
    .insert(projectsTable)
    .values({ ...parsed.data, status: "connected" })
    .returning();
  await db.insert(activityTable).values({
    kind: "connected",
    title: `${project.name} connected`,
    detail: `${project.environment} is now protected by the authorization gateway.`,
    actor: "You",
  });
  res.status(201).json(
    CreateProjectResponse.parse({
      ...project,
      features: 0,
      pendingReviews: 0,
    }),
  );
});

router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const parsed = GetProjectParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, parsed.data.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(GetProjectResponse.parse(await projectView(project)));
});

router.post("/projects/:projectId/revoke", async (req, res): Promise<void> => {
  const parsed = RevokeProjectParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db
    .update(projectsTable)
    .set({ status: "revoked" })
    .where(eq(projectsTable.id, parsed.data.projectId))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  await db.insert(activityTable).values({
    kind: "revoked",
    title: `${project.name} disconnected`,
    detail: "The authorization gateway can no longer release changes.",
    actor: "You",
  });
  res.json(RevokeProjectResponse.parse(await projectView(project)));
});

router.get("/features", async (req, res): Promise<void> => {
  const parsed = ListFeaturesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const features = parsed.data.projectId
    ? await db
        .select()
        .from(featuresTable)
        .where(eq(featuresTable.projectId, parsed.data.projectId))
        .orderBy(desc(featuresTable.createdAt))
    : await db
        .select()
        .from(featuresTable)
        .orderBy(desc(featuresTable.createdAt));
  const [projects, reviews] = await Promise.all([
    db.select().from(projectsTable),
    db.select().from(reviewsTable),
  ]);
  res.json(
    ListFeaturesResponse.parse(
      features.map((feature) => ({
        ...feature,
        projectName:
          projects.find((project) => project.id === feature.projectId)?.name ??
          "Unknown project",
        pendingReviews: reviews.filter(
          (review) =>
            review.featureId === feature.id && review.status === "pending",
        ).length,
      })),
    ),
  );
});

router.post("/features", async (req, res): Promise<void> => {
  const parsed = CreateFeatureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, parsed.data.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [feature] = await db
    .insert(featuresTable)
    .values({
      ...parsed.data,
      status: "protected",
      requiresHumanSignoff: true,
    })
    .returning();
  res.status(201).json(
    CreateFeatureResponse.parse({
      ...feature,
      projectName: project.name,
      pendingReviews: 0,
    }),
  );
});

router.get("/reviews", async (req, res): Promise<void> => {
  const parsed = ListReviewsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(
    ListReviewsResponse.parse(await reviewViews(parsed.data.status ?? "pending")),
  );
});

router.get("/reviews/:reviewId", async (req, res): Promise<void> => {
  const parsed = GetReviewParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const reviews = await reviewViews();
  const review = reviews.find((item) => item.id === parsed.data.reviewId);
  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  res.json(GetReviewResponse.parse(review));
});

router.patch("/reviews/:reviewId", async (req, res): Promise<void> => {
  const params = DecideReviewParams.safeParse(req.params);
  const body = DecideReviewBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res
      .status(400)
      .json({ error: params.error?.message ?? body.error?.message });
    return;
  }
  const [review] = await db
    .update(reviewsTable)
    .set({
      status: body.data.decision,
      decisionNote: body.data.note ?? null,
      decidedAt: new Date(),
    })
    .where(
      and(
        eq(reviewsTable.id, params.data.reviewId),
        eq(reviewsTable.status, "pending"),
      ),
    )
    .returning();
  if (!review) {
    res.status(404).json({ error: "Pending review not found" });
    return;
  }
  const views = await reviewViews();
  const view = views.find((item) => item.id === review.id)!;
  await db.insert(activityTable).values({
    kind: body.data.decision,
    title: `${view.title} ${body.data.decision}`,
    detail:
      body.data.note ||
      `Human review completed for ${view.featureName} in ${view.projectName}.`,
    actor: review.reviewer,
  });
  res.json(DecideReviewResponse.parse(view));
});

router.get("/management-actions", async (req, res): Promise<void> => {
  const parsed = ListManagementActionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(
    ListManagementActionsResponse.parse(
      await managementActionViews(
        parsed.data.status,
        parsed.data.projectId,
      ),
    ),
  );
});

router.post("/management-actions", async (req, res): Promise<void> => {
  const parsed = CreateManagementActionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, parsed.data.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [action] = await db
    .insert(managementActionsTable)
    .values({
      ...parsed.data,
      dueDate: parsed.data.dueDate
        ? parsed.data.dueDate.toISOString().slice(0, 10)
        : null,
      status: "pending",
    })
    .returning();
  await db.insert(activityTable).values({
    kind: "submitted",
    title: `${action.target} proposed`,
    detail: `Project management action ${action.actionType.replaceAll("_", " ")} is awaiting ${action.approver}.`,
    actor: action.requestedBy,
  });
  res.status(201).json(
    CreateManagementActionResponse.parse({
      ...action,
      projectName: project.name,
    }),
  );
});

router.get("/management-actions/:actionId", async (req, res): Promise<void> => {
  const parsed = GetManagementActionParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const actions = await managementActionViews();
  const action = actions.find((item) => item.id === parsed.data.actionId);
  if (!action) {
    res.status(404).json({ error: "Project management action not found" });
    return;
  }
  res.json(GetManagementActionResponse.parse(action));
});

router.patch(
  "/management-actions/:actionId",
  async (req, res): Promise<void> => {
    const params = DecideManagementActionParams.safeParse(req.params);
    const body = DecideManagementActionBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res
        .status(400)
        .json({ error: params.error?.message ?? body.error?.message });
      return;
    }
    const [action] = await db
      .update(managementActionsTable)
      .set({
        status: body.data.decision,
        decisionNote: body.data.note ?? null,
        decidedAt: new Date(),
      })
      .where(
        and(
          eq(managementActionsTable.id, params.data.actionId),
          eq(managementActionsTable.status, "pending"),
        ),
      )
      .returning();
    if (!action) {
      res
        .status(404)
        .json({ error: "Pending project management action not found" });
      return;
    }
    const views = await managementActionViews();
    const view = views.find((item) => item.id === action.id)!;
    await db.insert(activityTable).values({
      kind: body.data.decision,
      title: `${view.target} ${body.data.decision}`,
      detail:
        body.data.note ||
        `Project management action reviewed for ${view.projectName}.`,
      actor: action.approver,
    });
    res.json(DecideManagementActionResponse.parse(view));
  },
);

router.get("/activity", async (req, res): Promise<void> => {
  const parsed = ListActivityQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const activity = await db
    .select()
    .from(activityTable)
    .orderBy(desc(activityTable.occurredAt))
    .limit(parsed.data.limit ?? 10);
  res.json(ListActivityResponse.parse(activity));
});

export default router;
