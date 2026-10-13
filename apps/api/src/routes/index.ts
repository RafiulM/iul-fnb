import { Router } from "express";
import { noStore } from "../middleware/no-store";
import { adminRouter } from "./admin.routes";
import { healthRouter } from "./health.routes";
import { categoriesRouter, menusRouter, recipesRouter } from "./menu.routes";
import { notesRouter } from "./notes.routes";
import { ordersRouter, transactionsRouter } from "./orders.routes";
import { publicRouter } from "./public.routes";
import { reportsRouter } from "./reports.routes";
import { settingsRouter } from "./settings.routes";
import { staffRouter } from "./staff.routes";
import { ingredientsRouter, stockMovementsRouter } from "./stock.routes";
import { tablesRouter } from "./tables.routes";

// Mounted at /api. Add a router per resource and register it here.
export const apiRouter = Router();

apiRouter.use(noStore);
apiRouter.use("/health", healthRouter);
apiRouter.use("/notes", notesRouter);
apiRouter.use("/admin", adminRouter);

// IUL FnB. Customer QR Menu app (no account):
apiRouter.use("/public", publicRouter);
// Kasir + Dashboard app (staff accounts, checked per permission):
apiRouter.use("/orders", ordersRouter);
apiRouter.use("/transactions", transactionsRouter);
apiRouter.use("/menu-categories", categoriesRouter);
apiRouter.use("/menus", menusRouter);
apiRouter.use("/recipes", recipesRouter);
apiRouter.use("/tables", tablesRouter);
apiRouter.use("/ingredients", ingredientsRouter);
apiRouter.use("/stock-movements", stockMovementsRouter);
apiRouter.use("/staff", staffRouter);
apiRouter.use("/settings", settingsRouter);
apiRouter.use("/reports", reportsRouter);
