    import React from 'react';
    
    export default function MainLayout(props) {
        // Получаем компоненты из нового свойства `components`
        const { HeaderComponent, PageComponent } = props.components;
        return (
            <div id="layout">
                <h1>Layout</h1>
                {HeaderComponent && <HeaderComponent {...props} />}
                {PageComponent && <PageComponent {...props} />}
            </div>
        );
    }