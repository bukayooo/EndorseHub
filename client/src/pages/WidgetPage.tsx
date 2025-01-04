import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/hooks/use-user';
import { WidgetBuilder } from '@/components/widgets/WidgetBuilder';

export default function WidgetPage() {
  const { user, isLoading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Widget Builder</h1>
      <WidgetBuilder />
    </div>
  );
} 