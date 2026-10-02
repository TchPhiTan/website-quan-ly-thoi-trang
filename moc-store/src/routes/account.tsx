import { createFileRoute } from "@tanstack/react-router";
import { AccountLayout } from "@/components/account-layout";
export const Route = createFileRoute("/account")({ component: AccountLayout });
