"use client";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Influencer } from "@/lib/use-influencers";

export function DashboardInvoices({ attentionList }: { attentionList: Influencer[] }) {
	return (
		<Card className="rounded-none bg-background shadow-none ring-0 lg:col-span-3">
			<CardHeader>
				<CardTitle>Precisa de atenção</CardTitle>
				<CardDescription>Influenciadores que ainda não postaram hoje.</CardDescription>
			</CardHeader>
			<CardContent className="px-0 pb-2">
				{attentionList.length === 0 ? (
					<p className="px-6 pb-4 text-sm text-muted-foreground">Nenhum inadimplente hoje. 🎉</p>
				) : (
					<Table className="border-t">
						<TableCaption className="sr-only">Influenciadores que ainda não postaram.</TableCaption>
						<TableHeader>
							<TableRow>
								<TableHead className="pl-6">Influenciador</TableHead>
								<TableHead>@username</TableHead>
								<TableHead className="pr-6 text-right">Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{attentionList.map((inf) => (
								<TableRow className="h-14" key={inf.id}>
									<TableCell className="max-w-40 truncate pl-6 font-medium">
										{inf.name}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{inf.username}
									</TableCell>
									<TableCell className="pr-6 text-right">
										<Badge variant="destructive">Não Postou</Badge>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}