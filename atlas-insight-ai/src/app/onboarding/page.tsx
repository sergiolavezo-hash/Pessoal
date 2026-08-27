"use client";

import { useState } from "react";
import { Compass } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  organizationName: z.string().min(2, "Informe o nome da sua empresa ou time"),
  workspaceName: z.string().min(2, "Informe o nome do workspace"),
});

type FormValues = z.infer<typeof schema>;

export default function OnboardingPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { workspaceName: "Principal" },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const supabase = createClient();
    const slug = `${slugify(values.organizationName)}-${Math.random().toString(36).slice(2, 7)}`;
    const { error } = await supabase.rpc("bootstrap_organization", {
      org_name: values.organizationName,
      org_slug: slug,
      workspace_name: values.workspaceName,
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    window.location.assign("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-lg font-semibold">
          <Compass className="h-6 w-6 text-primary" />
          Atlas Insight AI
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Configure sua organização</CardTitle>
            <CardDescription>
              A organização reúne o seu time; os workspaces guardam fontes de dados, métricas e
              dashboards. Seu teste gratuito (14 dias ou 1 dashboard) começa agora.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="organizationName">Nome da empresa</Label>
                <Input id="organizationName" placeholder="Ex.: Atlas Tecnologia" {...register("organizationName")} />
                {errors.organizationName && (
                  <p className="text-xs text-destructive">{errors.organizationName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="workspaceName">Primeiro workspace</Label>
                <Input id="workspaceName" placeholder="Principal" {...register("workspaceName")} />
                {errors.workspaceName && (
                  <p className="text-xs text-destructive">{errors.workspaceName.message}</p>
                )}
              </div>
              {serverError && <p className="text-sm text-destructive">{serverError}</p>}
              <Button type="submit" className="w-full" loading={isSubmitting}>
                Criar workspace
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
